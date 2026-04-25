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

export function snapshotFromCodexEnv(): Partial<HudSnapshot> {
  const fiveHour = percentFromEnv('CODEX_RATE_LIMIT_5H_USED_PERCENT', 'CODEX_RATE_LIMIT_PRIMARY_USED_PERCENT');
  const weekly = percentFromEnv('CODEX_RATE_LIMIT_WEEKLY_USED_PERCENT', 'CODEX_RATE_LIMIT_SECONDARY_USED_PERCENT');
  if (fiveHour === null && weekly === null) return {};

  const usage = emptyUsageLimits();
  usage.fiveHour = { usedPercentage: fiveHour, resetsAt: null };
  usage.weekly = { usedPercentage: weekly, resetsAt: null };
  return { usage };
}
