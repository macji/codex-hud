import assert from 'node:assert/strict';
import test from 'node:test';
import { snapshotFromStdin } from '../src/adapters/stdin-adapter.js';

test('snapshotFromStdin maps Claude-compatible context payload', () => {
  const snapshot = snapshotFromStdin({
    model: { display_name: 'gpt-5.4' },
    context_window: {
      context_window_size: 200000,
      current_usage: { input_tokens: 45000, output_tokens: 1000, cache_read_input_tokens: 4000 },
    },
    rate_limits: { five_hour: { used_percentage: 25 }, seven_day: { used_percentage: 10 } },
  }, '/tmp/project');

  assert.equal(snapshot.model, 'gpt-5.4');
  assert.equal(snapshot.cwd, '/tmp/project');
  assert.equal(snapshot.context?.usedTokens, 50000);
  assert.equal(Math.round(snapshot.context?.usedPercentage ?? 0), 25);
  assert.equal(snapshot.usage?.fiveHour.usedPercentage, 25);
  assert.equal(snapshot.usage?.weekly.usedPercentage, 10);
});

test('snapshotFromStdin accepts simple Codex-style fields', () => {
  const snapshot = snapshotFromStdin({ model: 'gpt-5.5', reasoning_effort: 'high', session_id: 'abc' }, '/repo');
  assert.equal(snapshot.model, 'gpt-5.5');
  assert.equal(snapshot.reasoningEffort, 'high');
  assert.equal(snapshot.session?.id, 'abc');
});
