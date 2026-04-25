import path from 'node:path';
import { snapshotFromCodexConfig } from './adapters/codex-config-adapter.js';
import { snapshotFromCodexEnv } from './adapters/codex-env-adapter.js';
import { snapshotFromCodexTranscript } from './adapters/codex-transcript-adapter.js';
import { snapshotFromOmx } from './adapters/omx-adapter.js';
import { snapshotFromStdin } from './adapters/stdin-adapter.js';
import { getGitStatus } from './git.js';
import { emptyContext, type HudSnapshot, type RawStdinData } from './types.js';

function merge<T extends object>(...objects: Array<Partial<T> | undefined>): Partial<T> {
  return Object.assign({}, ...objects.filter(Boolean));
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

export async function buildSnapshot(raw: RawStdinData | null, cwd = process.cwd()): Promise<HudSnapshot> {
  const configSnapshot = snapshotFromCodexConfig();
  const transcriptSnapshot = snapshotFromCodexTranscript(cwd);
  const envSnapshot = snapshotFromCodexEnv();
  const omxSnapshot = snapshotFromOmx(cwd);
  const stdinSnapshot = snapshotFromStdin(raw, cwd);
  const effectiveCwd = stdinSnapshot.cwd ?? omxSnapshot.cwd ?? transcriptSnapshot.cwd ?? cwd;
  const session = merge(transcriptSnapshot.session, omxSnapshot.session, stdinSnapshot.session);
  return {
    model: stdinSnapshot.model ?? configSnapshot.model,
    reasoningEffort: stdinSnapshot.reasoningEffort ?? configSnapshot.reasoningEffort,
    projectName: path.basename(effectiveCwd),
    cwd: effectiveCwd,
    context: mergeContext(configSnapshot.context, transcriptSnapshot.context, stdinSnapshot.context),
    usage: stdinSnapshot.usage ?? envSnapshot.usage ?? transcriptSnapshot.usage ?? null,
    git: await getGitStatus(effectiveCwd),
    tools: stdinSnapshot.tools ?? transcriptSnapshot.tools ?? omxSnapshot.tools ?? [],
    agents: stdinSnapshot.agents ?? transcriptSnapshot.agents ?? omxSnapshot.agents ?? [],
    todos: stdinSnapshot.todos ?? transcriptSnapshot.todos ?? omxSnapshot.todos ?? [],
    session: {
      cwd: effectiveCwd,
      ...session,
    },
    codexVersion: transcriptSnapshot.codexVersion,
  };
}
