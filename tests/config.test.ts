import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { DEFAULT_CONFIG, mergeConfig } from '../src/config.js';
import { snapshotFromCodexConfig } from '../src/adapters/codex-config-adapter.js';

test('mergeConfig keeps defaults for invalid values', () => {
  const config = mergeConfig({ lineLayout: 'bad', maxWidth: 10, display: { contextValue: 'bad' } });
  assert.equal(config.lineLayout, DEFAULT_CONFIG.lineLayout);
  assert.equal(config.maxWidth, 40);
  assert.equal(config.display.contextValue, DEFAULT_CONFIG.display.contextValue);
});

test('mergeConfig applies valid display toggles', () => {
  const config = mergeConfig({ lineLayout: 'compact', language: 'zh', display: { showTools: true, gitMode: 'files', customLine: 'hello' } });
  assert.equal(config.lineLayout, 'compact');
  assert.equal(config.language, 'zh');
  assert.equal(config.display.showTools, true);
  assert.equal(config.display.gitMode, 'files');
  assert.equal(config.display.customLine, 'hello');
});

test('mergeConfig applies theme overrides', () => {
  const config = mergeConfig({ theme: { model: 'magenta', low: '#00ff00' } });
  assert.equal(config.theme.model, 'magenta');
  assert.equal(config.theme.low, '#00ff00');
  assert.equal(config.theme.high, DEFAULT_CONFIG.theme.high);
});

test('snapshotFromCodexConfig prefers official GPT-5.5 Codex window over stale model cache', () => {
  const originalHome = process.env.CODEX_HOME;
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-config-'));
  fs.writeFileSync(path.join(home, 'config.toml'), 'model = "gpt-5.5"\nmodel_reasoning_effort = "high"\n');
  fs.writeFileSync(path.join(home, 'models_cache.json'), JSON.stringify({ models: [{ slug: 'gpt-5.5', context_window: 272000, effective_context_window_percent: 95 }] }));
  try {
    process.env.CODEX_HOME = home;
    const snapshot = snapshotFromCodexConfig();
    assert.equal(snapshot.context?.windowSize, 400000);
  } finally {
    if (originalHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = originalHome;
  }
});
