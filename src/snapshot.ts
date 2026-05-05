import path from 'node:path';
import { snapshotFromCodexConfig } from './adapters/codex-config-adapter.js';
import { snapshotFromCodexEnv } from './adapters/codex-env-adapter.js';
import { snapshotFromCodexTranscript } from './adapters/codex-transcript-adapter.js';
import { snapshotFromOmx } from './adapters/omx-adapter.js';
import { snapshotFromStdin } from './adapters/stdin-adapter.js';
import { getGitStatus } from './git.js';
import { emptyContext, type HudSnapshot, type RawStdinData } from './types.js';

export interface BuildSnapshotOptions {
  includeActivity?: boolean;
  includeGit?: boolean;
  includeOmx?: boolean;
}

function merge<T extends object>(...objects: Array<Partial<T> | undefined>): Partial<T> {
  return Object.assign({}, ...objects.filter(Boolean));
}

function officialContextWindow(model: string | undefined): number | null {
  return model === 'gpt-5.5' ? 400_000 : null;
}

function normalizeContextForModel(context: HudSnapshot['context'], model: string | undefined): HudSnapshot['context'] {
  const windowSize = officialContextWindow(model);
  if (!windowSize || context.windowSize === windowSize) return context;
  const normalized = { ...context, windowSize };
  normalized.usedPercentage = normalized.usedTokens !== null ? (normalized.usedTokens / windowSize) * 100 : normalized.usedPercentage;
  normalized.remainingPercentage = normalized.usedPercentage === null ? normalized.remainingPercentage : Math.max(0, 100 - normalized.usedPercentage);
  return normalized;
}

function mergeContext(
  configContext: Partial<HudSnapshot>['context'],
  transcriptContext: Partial<HudSnapshot>['context'],
  stdinContext: Partial<HudSnapshot>['context'],
): HudSnapshot['context'] {
  const context = {
    ...emptyContext(),
    ...(transcriptContext ?? {}),
    ...(stdinContext ?? {}),
  };
  if (configContext?.windowSize && !stdinContext?.windowSize && !transcriptContext?.windowSize) {
    context.windowSize = configContext.windowSize;
  }
  context.usedPercentage = context.windowSize && context.usedTokens !== null ? (context.usedTokens / context.windowSize) * 100 : context.usedPercentage;
  context.remainingPercentage = context.usedPercentage === null ? context.remainingPercentage : Math.max(0, 100 - context.usedPercentage);
  return context;
}

export async function buildSnapshot(raw: RawStdinData | null, cwd = process.cwd(), options: BuildSnapshotOptions = {}): Promise<HudSnapshot> {
  const includeActivity = options.includeActivity ?? true;
  const includeGit = options.includeGit ?? true;
  const includeOmx = options.includeOmx ?? true;
  const transcriptSnapshot = snapshotFromCodexTranscript(cwd, { includeActivity });
  const envSnapshot = snapshotFromCodexEnv();
  const stdinSnapshot = snapshotFromStdin(raw, cwd);
  const configSnapshot = snapshotFromCodexConfig(stdinSnapshot.model ?? envSnapshot.model ?? transcriptSnapshot.model);
  const omxSnapshot = includeOmx ? snapshotFromOmx(cwd) : {};
  const effectiveCwd = stdinSnapshot.cwd ?? omxSnapshot.cwd ?? transcriptSnapshot.cwd ?? cwd;
  const session = merge(transcriptSnapshot.session, omxSnapshot.session, stdinSnapshot.session);
  const model = stdinSnapshot.model ?? envSnapshot.model ?? transcriptSnapshot.model ?? configSnapshot.model;
  const reasoningEffort = stdinSnapshot.reasoningEffort ?? envSnapshot.reasoningEffort ?? transcriptSnapshot.reasoningEffort ?? configSnapshot.reasoningEffort;
  const context = normalizeContextForModel(mergeContext(configSnapshot.context, transcriptSnapshot.context, stdinSnapshot.context), model);
  return {
    model,
    reasoningEffort,
    projectName: path.basename(effectiveCwd),
    cwd: effectiveCwd,
    context,
    usage: stdinSnapshot.usage ?? envSnapshot.usage ?? transcriptSnapshot.usage ?? null,
    git: includeGit ? await getGitStatus(effectiveCwd) : null,
    tools: includeActivity ? stdinSnapshot.tools ?? transcriptSnapshot.tools ?? omxSnapshot.tools ?? [] : [],
    agents: includeActivity ? stdinSnapshot.agents ?? transcriptSnapshot.agents ?? omxSnapshot.agents ?? [] : [],
    todos: includeActivity ? stdinSnapshot.todos ?? transcriptSnapshot.todos ?? omxSnapshot.todos ?? [] : [],
    session: {
      cwd: effectiveCwd,
      ...session,
    },
    codexVersion: transcriptSnapshot.codexVersion,
  };
}
