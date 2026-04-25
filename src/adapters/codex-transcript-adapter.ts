import fs from 'node:fs';
import path from 'node:path';
import { getCodexHome } from '../config.js';
import { emptyContext, emptyUsageLimits, type AgentEntry, type HudSnapshot, type TodoItem, type ToolEntry } from '../types.js';

interface TranscriptEvent {
  timestamp?: string;
  type?: string;
  payload?: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseReset(value: unknown): Date | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const date = typeof value === 'number' && value < 10_000_000_000 ? new Date(value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clampPercent(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function readJson(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  } catch {
    return null;
  }
}

function currentSessionId(cwd: string): string | undefined {
  if (process.env.CODEX_THREAD_ID) return process.env.CODEX_THREAD_ID;
  if (process.env.CODEX_SESSION_ID) return process.env.CODEX_SESSION_ID;
  if (process.env.CODEX_HUD_CURRENT_ONLY === '1') return undefined;
  const omxSession = asRecord(readJson(path.join(cwd, '.omx', 'state', 'session.json')));
  return typeof omxSession?.session_id === 'string' ? omxSession.session_id : undefined;
}

function currentTranscriptPath(): string | undefined {
  const transcriptPath = process.env.CODEX_TRANSCRIPT_PATH || process.env.CODEX_ROLLOUT_PATH;
  return transcriptPath && fs.existsSync(transcriptPath) ? transcriptPath : undefined;
}

function walkJsonlFiles(root: string, limit = 400): string[] {
  const files: Array<{ filePath: string; mtimeMs: number }> = [];
  const stack = [root];
  while (stack.length > 0 && files.length < limit) {
    const current = stack.pop() as string;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        try {
          files.push({ filePath: fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs });
        } catch {
          // Ignore disappearing files.
        }
      }
    }
  }
  return files.sort((left, right) => right.mtimeMs - left.mtimeMs).map(file => file.filePath);
}

export function findCodexTranscript(
  cwd = process.cwd(),
  sessionId = currentSessionId(cwd),
  transcriptPath = currentTranscriptPath(),
): string | null {
  if (transcriptPath) return transcriptPath;
  const currentOnly = process.env.CODEX_HUD_CURRENT_ONLY === '1';
  if (currentOnly && !sessionId) return null;
  const sessionsRoot = path.join(getCodexHome(), 'sessions');
  const files = walkJsonlFiles(sessionsRoot);
  if (sessionId) {
    const byName = files.find(file => file.includes(sessionId));
    if (byName) return byName;
  }
  for (const file of files.slice(0, 80)) {
    try {
      const head = fs.readFileSync(file, 'utf8').split('\n', 2).join('\n');
      if (sessionId && head.includes(sessionId)) return file;
      if (!currentOnly && head.includes(`"cwd":"${cwd.replaceAll('\\', '\\\\')}"`)) return file;
    } catch {
      // Keep searching.
    }
  }
  return currentOnly ? null : files[0] ?? null;
}

function safeJson(line: string): TranscriptEvent | null {
  try {
    return JSON.parse(line) as TranscriptEvent;
  } catch {
    return null;
  }
}

function toolTarget(payload: Record<string, unknown>): string | undefined {
  const args = asRecord(typeof payload.arguments === 'string' ? readArguments(payload.arguments) : payload.arguments);
  if (!args) return undefined;
  const command = typeof args.cmd === 'string' ? args.cmd : typeof args.command === 'string' ? args.command : undefined;
  const pathValue = typeof args.path === 'string' ? args.path : typeof args.file === 'string' ? args.file : undefined;
  return (command ?? pathValue)?.slice(0, 60);
}

function readArguments(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return {};
  }
}

function normalizeTodoStatus(value: unknown): TodoItem['status'] | null {
  if (value === 'completed' || value === 'complete' || value === 'done') return 'completed';
  if (value === 'in_progress' || value === 'running') return 'in_progress';
  if (value === 'pending' || value === 'not_started') return 'pending';
  return null;
}

function extractPlanTodos(payload: Record<string, unknown>): TodoItem[] | null {
  if (payload.name !== 'update_plan') return null;
  const args = asRecord(readArguments(payload.arguments));
  const plan = Array.isArray(args?.plan) ? args.plan : [];
  const todos = plan
    .map(item => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map(item => ({
      content: typeof item.step === 'string' ? item.step : 'Untitled task',
      status: normalizeTodoStatus(item.status) ?? 'pending',
    }));
  return todos.length > 0 ? todos : null;
}

function applyTokenCount(snapshot: Partial<HudSnapshot>, payload: Record<string, unknown>): void {
  const info = asRecord(payload.info);
  const currentTurn = asRecord(info?.last_token_usage);
  const sessionTotal = asRecord(info?.total_token_usage);
  const context = snapshot.context ?? emptyContext();
  const input = typeof currentTurn?.input_tokens === 'number' ? currentTurn.input_tokens : null;
  const output = typeof currentTurn?.output_tokens === 'number' ? currentTurn.output_tokens : null;
  const totalTokens = typeof currentTurn?.total_tokens === 'number' ? currentTurn.total_tokens : null;
  const windowSize = typeof payload.model_context_window === 'number'
    ? payload.model_context_window
    : typeof info?.model_context_window === 'number'
      ? info.model_context_window
      : context.windowSize;
  context.inputTokens = input ?? context.inputTokens;
  context.outputTokens = output ?? context.outputTokens;
  context.usedTokens = totalTokens ?? context.usedTokens;
  context.windowSize = windowSize ?? context.windowSize;
  context.usedPercentage = context.windowSize && context.usedTokens !== null ? (context.usedTokens / context.windowSize) * 100 : context.usedPercentage;
  context.remainingPercentage = context.usedPercentage === null ? context.remainingPercentage : Math.max(0, 100 - context.usedPercentage);
  snapshot.context = context;

  if (sessionTotal) {
    const previous = snapshot.session;
    snapshot.session = {
      cwd: previous?.cwd ?? snapshot.cwd ?? process.cwd(),
      ...previous,
      totalTokens: {
        inputTokens: typeof sessionTotal.input_tokens === 'number' ? sessionTotal.input_tokens : 0,
        outputTokens: typeof sessionTotal.output_tokens === 'number' ? sessionTotal.output_tokens : 0,
        cacheCreationTokens: typeof sessionTotal.cache_creation_input_tokens === 'number' ? sessionTotal.cache_creation_input_tokens : 0,
        cacheReadTokens: typeof sessionTotal.cache_read_input_tokens === 'number' ? sessionTotal.cache_read_input_tokens : 0,
      },
    };
  }

  const rateLimits = asRecord(payload.rate_limits);
  const primary = asRecord(rateLimits?.primary);
  const secondary = asRecord(rateLimits?.secondary);
  if (primary || secondary) {
    const usage = snapshot.usage ?? emptyUsageLimits();
    usage.fiveHour = {
      usedPercentage: clampPercent(primary?.used_percent) ?? usage.fiveHour.usedPercentage,
      resetsAt: parseReset(primary?.resets_at) ?? usage.fiveHour.resetsAt,
    };
    usage.weekly = {
      usedPercentage: clampPercent(secondary?.used_percent) ?? usage.weekly.usedPercentage,
      resetsAt: parseReset(secondary?.resets_at) ?? usage.weekly.resetsAt,
    };
    snapshot.usage = usage;
  }
}

function finishTool(tools: Map<string, ToolEntry>, payload: Record<string, unknown>, timestamp: Date): void {
  const callId = typeof payload.call_id === 'string' ? payload.call_id : undefined;
  if (!callId) return;
  const tool = tools.get(callId);
  if (!tool) return;
  tool.status = payload.success === false || typeof payload.stderr === 'string' && payload.stderr.length > 0 ? 'error' : 'completed';
  tool.endTime = timestamp;
}

export function parseCodexTranscript(transcriptPath: string): Partial<HudSnapshot> {
  const tools = new Map<string, ToolEntry>();
  const agents = new Map<string, AgentEntry>();
  let todos: TodoItem[] = [];
  const snapshot: Partial<HudSnapshot> = {};

  let content: string;
  try {
    content = fs.readFileSync(transcriptPath, 'utf8');
  } catch {
    return {};
  }

  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    const event = safeJson(line);
    const payload = asRecord(event?.payload);
    if (!event || !payload) continue;
    const timestamp = parseDate(event.timestamp) ?? new Date();

    if (event.type === 'session_meta') {
      const cwd = typeof payload.cwd === 'string' ? payload.cwd : process.cwd();
      snapshot.cwd = cwd;
      snapshot.session = {
        cwd,
        id: typeof payload.id === 'string' ? payload.id : undefined,
        startedAt: parseDate(payload.timestamp),
        transcriptPath,
      };
      snapshot.codexVersion = typeof payload.cli_version === 'string' ? payload.cli_version : undefined;
    }

    if (payload.type === 'task_started') {
      applyTokenCount(snapshot, payload);
    }

    if (payload.type === 'token_count') {
      applyTokenCount(snapshot, payload);
    }

    if (event.type === 'response_item' && payload.type === 'function_call') {
      const name = typeof payload.name === 'string' ? payload.name : 'tool';
      const callId = typeof payload.call_id === 'string' ? payload.call_id : `${name}-${tools.size}`;
      const plannedTodos = extractPlanTodos(payload);
      if (plannedTodos) {
        todos = plannedTodos;
      } else if (name === 'spawn_agent') {
        const args = asRecord(readArguments(payload.arguments));
        const agent: AgentEntry = {
          id: callId,
          type: typeof args?.agent_type === 'string' ? args.agent_type : 'agent',
          description: typeof args?.message === 'string' ? args.message.slice(0, 120) : undefined,
          status: 'running',
          startTime: timestamp,
        };
        agents.set(callId, agent);
      } else {
        tools.set(callId, {
          id: callId,
          name,
          target: toolTarget(payload),
          status: 'running',
          startTime: timestamp,
        });
      }
    }

    if (payload.type === 'exec_command_end' || payload.type === 'patch_apply_end') {
      finishTool(tools, payload, timestamp);
    }

    if (payload.type === 'function_call_output') {
      finishTool(tools, payload, timestamp);
      const agent = agents.get(typeof payload.call_id === 'string' ? payload.call_id : '');
      if (agent) {
        agent.status = 'completed';
        agent.endTime = timestamp;
      }
    }
  }

  snapshot.tools = Array.from(tools.values()).slice(-20);
  snapshot.agents = Array.from(agents.values()).slice(-10);
  snapshot.todos = todos;
  return snapshot;
}

export function snapshotFromCodexTranscript(cwd = process.cwd()): Partial<HudSnapshot> {
  const transcriptPath = findCodexTranscript(cwd);
  return transcriptPath ? parseCodexTranscript(transcriptPath) : {};
}
