import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeConfig } from '../src/config.js';
import { render, renderStatusLine } from '../src/render/index.js';
import { emptyContext, type HudSnapshot } from '../src/types.js';

function snapshot(): HudSnapshot {
  return {
    model: 'gpt-5.4',
    reasoningEffort: 'high',
    projectName: 'codex-hud',
    cwd: '/tmp/codex-hud',
    context: { ...emptyContext(), windowSize: 200000, usedTokens: 50000, usedPercentage: 25, remainingPercentage: 75 },
    usage: { fiveHour: { usedPercentage: 25, resetsAt: null }, weekly: { usedPercentage: 10, resetsAt: null } },
    git: { branch: 'main', dirty: true, ahead: 1, behind: 0, added: 1, modified: 2, deleted: 0, untracked: 3 },
    tools: [{ id: '1', name: 'Read', target: 'src/index.ts', status: 'completed', startTime: new Date() }],
    agents: [{ id: 'a', type: 'explore', status: 'running', startTime: new Date(), description: 'mapping files' }],
    todos: [{ content: 'Implement renderer', status: 'in_progress' }],
    session: { cwd: '/tmp/codex-hud', duration: '2m' },
    codexVersion: '0.124.0',
  };
}

test('render emits core expanded lines', () => {
  const output = render({ snapshot: snapshot(), config: mergeConfig({ colors: false }) });
  assert.match(output, /Project codex-hud/);
  assert.match(output, /Context/);
  assert.match(output, /Usage/);
  assert.match(output, /Model gpt-5.4/);
});

test('render can show activity lines', () => {
  const output = render({ snapshot: snapshot(), config: mergeConfig({ colors: false, display: { showTools: true, showAgents: true, showTodos: true } }) });
  assert.match(output, /Tools ✓ Read: src\/index.ts/);
  assert.match(output, /Agents ◐ explore/);
  assert.match(output, /Todos 0\/1/);
});

test('render supports Chinese labels', () => {
  const output = render({ snapshot: snapshot(), config: mergeConfig({ colors: false, language: 'zh' }) });
  assert.match(output, /项目 codex-hud/);
  assert.match(output, /上下文/);
});

test('renderStatusLine emits progress bars', () => {
  const statusSnapshot = snapshot();
  statusSnapshot.model = 'gpt-5.5';
  statusSnapshot.context = { ...statusSnapshot.context, windowSize: 1_100_000, usedTokens: 48_700, usedPercentage: 5 };
  statusSnapshot.usage = { fiveHour: { usedPercentage: 93, resetsAt: null }, weekly: { usedPercentage: 98, resetsAt: null } };
  const output = renderStatusLine({ snapshot: statusSnapshot, config: mergeConfig({ colors: false }) });
  assert.equal(output, 'gpt-5.5 high | 48.7K/1.1M | [░░░░░░░░░░] 5% | 5h 93% | weekly 98%\n');
  assert.doesNotMatch(output, /\n.+\n/);
});

test('renderStatusLine keeps usage inline', () => {
  const statusSnapshot = snapshot();
  statusSnapshot.model = 'gpt-5.5';
  statusSnapshot.context = { ...statusSnapshot.context, windowSize: 258_400, usedTokens: 208_500, usedPercentage: 80.69 };
  statusSnapshot.usage = { fiveHour: { usedPercentage: 1, resetsAt: null }, weekly: { usedPercentage: 3, resetsAt: null } };
  const output = renderStatusLine({ snapshot: statusSnapshot, config: mergeConfig({ colors: false }) });
  assert.equal(output, 'gpt-5.5 high | 208.5K/258.4K | [████████░░] 81% | 5h 1% | weekly 3%\n');
});

test('renderStatusLine always reserves inline usage placeholders', () => {
  const statusSnapshot = snapshot();
  statusSnapshot.usage = null;
  const output = renderStatusLine({ snapshot: statusSnapshot, config: mergeConfig({ colors: false }) });
  assert.match(output, / \| 5h \? \| weekly \?\n$/);
});

test('renderStatusLine shows rounded derived context percentage', () => {
  const statusSnapshot = snapshot();
  statusSnapshot.context = { ...statusSnapshot.context, windowSize: 1_100_000, usedTokens: 48_700, usedPercentage: (48_700 / 1_100_000) * 100 };
  const output = renderStatusLine({ snapshot: statusSnapshot, config: mergeConfig({ colors: false }) });
  assert.match(output, /48\.7K\/1\.1M \| \[░░░░░░░░░░\] 4%/);
});

test('renderStatusLine emits semantic ANSI colors', () => {
  const originalNoColor = process.env.NO_COLOR;
  delete process.env.NO_COLOR;
  const statusSnapshot = snapshot();
  statusSnapshot.context = { ...statusSnapshot.context, windowSize: 1_100_000, usedTokens: 48_700, usedPercentage: 5 };
  statusSnapshot.usage = { fiveHour: { usedPercentage: 93, resetsAt: null }, weekly: { usedPercentage: 98, resetsAt: null } };
  try {
    const output = renderStatusLine({ snapshot: statusSnapshot, config: mergeConfig({ colors: true }) });
    assert.match(output, /\x1b\[38;2;204;155;31mgpt-5\.4 high\x1b\[0m \| \x1b\[38;2;204;155;31m48\.7K\/1\.1M\x1b\[0m/);
    assert.match(output, /\x1b\[38;2;143;188;143m\[░░░░░░░░░░\] 5%\x1b\[0m/);
    assert.match(output, /\x1b\[38;2;204;155;31m5h 93%\x1b\[0m \| \x1b\[38;2;204;155;31mweekly 98%\x1b\[0m/);
  } finally {
    if (originalNoColor === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = originalNoColor;
  }
});