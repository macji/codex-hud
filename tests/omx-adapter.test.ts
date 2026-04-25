import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { snapshotFromOmx } from '../src/adapters/omx-adapter.js';

test('snapshotFromOmx reads session and active modes defensively', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-hud-'));
  fs.mkdirSync(path.join(cwd, '.omx', 'state'), { recursive: true });
  fs.writeFileSync(path.join(cwd, '.omx', 'state', 'session.json'), JSON.stringify({ session_id: 's1', started_at: new Date().toISOString() }));
  fs.writeFileSync(path.join(cwd, '.omx', 'state', 'ralph-state.json'), JSON.stringify({ active: true, task_description: 'finish task', started_at: new Date().toISOString() }));

  const snapshot = snapshotFromOmx(cwd);
  assert.equal(snapshot.session?.id, 's1');
  assert.equal(snapshot.agents?.[0]?.type, 'ralph');
  assert.equal(snapshot.todos?.[0]?.content, 'finish task');
});
