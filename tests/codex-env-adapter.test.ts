import assert from 'node:assert/strict';
import test from 'node:test';
import { snapshotFromCodexEnv } from '../src/adapters/codex-env-adapter.js';

test('snapshotFromCodexEnv maps injected rate limit percentages', () => {
  const originalModel = process.env.CODEX_MODEL;
  const originalReasoningEffort = process.env.CODEX_REASONING_EFFORT;
  const originalFiveHour = process.env.CODEX_RATE_LIMIT_5H_USED_PERCENT;
  const originalWeekly = process.env.CODEX_RATE_LIMIT_WEEKLY_USED_PERCENT;
  try {
    process.env.CODEX_MODEL = 'gpt-5.4';
    process.env.CODEX_REASONING_EFFORT = 'medium';
    process.env.CODEX_RATE_LIMIT_5H_USED_PERCENT = '2';
    process.env.CODEX_RATE_LIMIT_WEEKLY_USED_PERCENT = '3';
    const snapshot = snapshotFromCodexEnv();
    assert.equal(snapshot.model, 'gpt-5.4');
    assert.equal(snapshot.reasoningEffort, 'medium');
    assert.equal(snapshot.usage?.fiveHour.usedPercentage, 2);
    assert.equal(snapshot.usage?.weekly.usedPercentage, 3);
  } finally {
    if (originalModel === undefined) delete process.env.CODEX_MODEL;
    else process.env.CODEX_MODEL = originalModel;
    if (originalReasoningEffort === undefined) delete process.env.CODEX_REASONING_EFFORT;
    else process.env.CODEX_REASONING_EFFORT = originalReasoningEffort;
    if (originalFiveHour === undefined) delete process.env.CODEX_RATE_LIMIT_5H_USED_PERCENT;
    else process.env.CODEX_RATE_LIMIT_5H_USED_PERCENT = originalFiveHour;
    if (originalWeekly === undefined) delete process.env.CODEX_RATE_LIMIT_WEEKLY_USED_PERCENT;
    else process.env.CODEX_RATE_LIMIT_WEEKLY_USED_PERCENT = originalWeekly;
  }
});
