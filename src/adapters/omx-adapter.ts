import fs from 'node:fs';
import path from 'node:path';
import type { AgentEntry, HudSnapshot, TodoItem } from '../types.js';

function readJson(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function durationSince(startedAt?: Date): string | undefined {
  if (!startedAt) return undefined;
  const seconds = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function snapshotFromOmx(cwd = process.cwd()): Partial<HudSnapshot> {
  const stateDir = path.join(cwd, '.omx', 'state');
  const session = asRecord(readJson(path.join(stateDir, 'session.json')));
  const startedAt = parseDate(session?.started_at);
  const agents: AgentEntry[] = [];
  const todos: TodoItem[] = [];

  for (const mode of ['ralph', 'ultrawork', 'autopilot', 'team'] as const) {
    const state = asRecord(readJson(path.join(stateDir, `${mode}-state.json`)));
    if (!state || state.active === false) continue;
    agents.push({
      id: mode,
      type: mode,
      description: typeof state.current_phase === 'string' ? state.current_phase : typeof state.task_description === 'string' ? state.task_description : undefined,
      status: 'running',
      startTime: parseDate(state.started_at) ?? new Date(),
    });
    if (typeof state.task_description === 'string') {
      todos.push({ content: state.task_description, status: 'in_progress' });
    }
  }

  return {
    cwd,
    agents,
    todos,
    session: {
      cwd,
      id: typeof session?.session_id === 'string' ? session.session_id : undefined,
      startedAt,
      duration: durationSince(startedAt),
    },
  };
}
