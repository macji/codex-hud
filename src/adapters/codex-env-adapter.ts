import { emptyUsageLimits, type HudSnapshot } from '../types.js';

function percentFromEnv(...names: string[]): number | null {
  for (const name of names) {
    const raw = process.env[name];
    if (raw === undefined || raw.trim() === '') continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return Math.max(0, Math.min(100, value));
  }
  return null;
}

function stringFromEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const raw = process.env[name];
    if (raw === undefined) continue;
    const value = raw.trim();
    if (value) return value;
  }
  return undefined;
}

export function snapshotFromCodexEnv(): Partial<HudSnapshot> {
  const model = stringFromEnv('CODEX_MODEL');
  const reasoningEffort = stringFromEnv('CODEX_REASONING_EFFORT', 'CODEX_MODEL_REASONING_EFFORT');
  const fiveHour = percentFromEnv('CODEX_RATE_LIMIT_5H_USED_PERCENT', 'CODEX_RATE_LIMIT_PRIMARY_USED_PERCENT');
  const weekly = percentFromEnv('CODEX_RATE_LIMIT_WEEKLY_USED_PERCENT', 'CODEX_RATE_LIMIT_SECONDARY_USED_PERCENT');

  const snapshot: Partial<HudSnapshot> = { model, reasoningEffort };
  if (fiveHour !== null || weekly !== null) {
    const usage = emptyUsageLimits();
    usage.fiveHour = { usedPercentage: fiveHour, resetsAt: null };
    usage.weekly = { usedPercentage: weekly, resetsAt: null };
    snapshot.usage = usage;
  }
  return snapshot;
}
