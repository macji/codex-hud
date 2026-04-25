import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CODEX_STATUS_LINE, defaultStatusLineCommand, patchCodexConfigToml } from '../src/setup.js';

test('patchCodexConfigToml inserts tui before tui subtable', () => {
  const input = 'model = "gpt-5.5"\n\n[tui.model_availability_nux]\n"gpt-5.5" = 3\n';
  const { output, changed } = patchCodexConfigToml(input);
  assert.equal(changed, true);
  assert.doesNotMatch(output, /^model_context_window =/m);
  assert.match(output, /\[tui\]\nstatus_line = \[\]\n\n\[tui\.model_availability_nux\]/);
});

test('patchCodexConfigToml writes status line command', () => {
  const input = '[tui]\nstatus_line = ["model-name"]\n';
  const { output } = patchCodexConfigToml(input, [], 'cd "/repo" && CODEX_HUD_CURRENT_ONLY=1 node dist/src/index.js --status-line --color');
  assert.match(output, /\[tui\]\nstatus_line = \[\]\nstatus_line_command = "cd \\"\/repo\\" && CODEX_HUD_CURRENT_ONLY=1 node dist\/src\/index.js --status-line --color"/);
});

test('patchCodexConfigToml replaces existing status line only inside tui', () => {
  const input = '[tui]\nstatus_line = ["model-name"]\n\n[features]\ncodex_hooks = true\n';
  const { output } = patchCodexConfigToml(input, DEFAULT_CODEX_STATUS_LINE);
  assert.match(output, /\[tui\]\nstatus_line = \[\]/);
  assert.match(output, /\[features\]\ncodex_hooks = true/);
});

test('patchCodexConfigToml is idempotent', () => {
  const input = '[tui]\nstatus_line = []\n';
  const { output, changed } = patchCodexConfigToml(input);
  assert.equal(changed, false);
  assert.equal(output, input);
});

test('defaultStatusLineCommand points at color renderer', () => {
  assert.equal(
    defaultStatusLineCommand('/repo'),
    'cd "/repo" && CODEX_HUD_CURRENT_ONLY=1 node dist/src/index.js --status-line --color',
  );
});
