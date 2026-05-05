import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { findCodexTranscript, parseCodexTranscript } from '../src/adapters/codex-transcript-adapter.js';

test('parseCodexTranscript extracts session, limits, tools and plan todos', () => {
  const filePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'codex-transcript-')), 'session.jsonl');
  const now = new Date().toISOString();
  const lines = [
    { timestamp: now, type: 'session_meta', payload: { id: 's1', timestamp: now, cwd: '/repo', cli_version: '0.124.0' } },
    { timestamp: now, type: 'event_msg', payload: { type: 'task_started', model_context_window: 1000 } },
    {
      timestamp: now,
      type: 'event_msg',
      payload: {
        type: 'token_count',
        info: {
          last_token_usage: { input_tokens: 100, output_tokens: 50, total_tokens: 150 },
          total_token_usage: { input_tokens: 1000, output_tokens: 500, total_tokens: 1500 },
        },
        rate_limits: { primary: { used_percent: 25, resets_at: 1777103062 }, secondary: { used_percent: 10, resets_at: 1777428130 } },
      },
    },
    { timestamp: now, type: 'response_item', payload: { type: 'function_call', name: 'exec_command', call_id: 'c1', arguments: JSON.stringify({ cmd: 'npm test' }) } },
    { timestamp: now, type: 'event_msg', payload: { type: 'exec_command_end', call_id: 'c1', stderr: '', success: true } },
    { timestamp: now, type: 'response_item', payload: { type: 'function_call', name: 'update_plan', call_id: 'p1', arguments: JSON.stringify({ plan: [{ step: 'Add setup', status: 'completed' }, { step: 'Add watch', status: 'in_progress' }] }) } },
  ];
  fs.writeFileSync(filePath, `${lines.map(line => JSON.stringify(line)).join('\n')}\n`);

  const snapshot = parseCodexTranscript(filePath);
  assert.equal(snapshot.session?.id, 's1');
  assert.equal(snapshot.codexVersion, '0.124.0');
  assert.equal(snapshot.context?.usedTokens, 150);
  assert.equal(snapshot.context?.usedPercentage, 15);
  assert.equal(snapshot.usage?.fiveHour.usedPercentage, 25);
  assert.equal(snapshot.session?.totalTokens?.inputTokens, 1000);
  assert.equal(snapshot.tools?.[0]?.status, 'completed');
  assert.equal(snapshot.tools?.[0]?.target, 'npm test');
  assert.equal(snapshot.todos?.[1]?.status, 'in_progress');
});

test('parseCodexTranscript upgrades stale GPT-5.5 transcript window to official Codex window', () => {
  const filePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'codex-transcript-')), 'session.jsonl');
  const now = new Date().toISOString();
  const lines = [
    { timestamp: now, type: 'session_meta', payload: { id: 's1', timestamp: now, cwd: '/repo', model: 'gpt-5.5', model_reasoning_effort: 'high' } },
    { timestamp: now, type: 'event_msg', payload: { type: 'token_count', info: { last_token_usage: { total_tokens: 40_000 }, model_context_window: 258_400 } } },
  ];
  fs.writeFileSync(filePath, `${lines.map(line => JSON.stringify(line)).join('\n')}\n`);

  const snapshot = parseCodexTranscript(filePath);
  assert.equal(snapshot.model, 'gpt-5.5');
  assert.equal(snapshot.context?.windowSize, 400_000);
  assert.equal(snapshot.context?.usedPercentage, 10);
});

test('parseCodexTranscript samples large transcripts from head and tail', () => {
  const filePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'codex-transcript-')), 'session.jsonl');
  const now = new Date().toISOString();
  const session = { timestamp: now, type: 'session_meta', payload: { id: 'large-session', timestamp: now, cwd: '/repo', model: 'gpt-5.4' } };
  const filler = { timestamp: now, type: 'event_msg', payload: { type: 'noop', data: 'x'.repeat(2_400_000) } };
  const tokenCount = {
    timestamp: now,
    type: 'event_msg',
    payload: { type: 'token_count', info: { last_token_usage: { total_tokens: 250 }, model_context_window: 1000 } },
  };
  fs.writeFileSync(filePath, `${JSON.stringify(session)}\n${JSON.stringify(filler)}\n${JSON.stringify(tokenCount)}\n`);

  const snapshot = parseCodexTranscript(filePath);
  assert.equal(snapshot.session?.id, 'large-session');
  assert.equal(snapshot.model, 'gpt-5.4');
  assert.equal(snapshot.context?.usedTokens, 250);
  assert.equal(snapshot.context?.usedPercentage, 25);
});

test('parseCodexTranscript can skip activity extraction for status-line refreshes', () => {
  const filePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'codex-transcript-')), 'session.jsonl');
  const now = new Date().toISOString();
  const lines = [
    { timestamp: now, type: 'session_meta', payload: { id: 's1', timestamp: now, cwd: '/repo' } },
    { timestamp: now, type: 'response_item', payload: { type: 'function_call', name: 'exec_command', call_id: 'c1', arguments: JSON.stringify({ cmd: 'npm test' }) } },
    { timestamp: now, type: 'event_msg', payload: { type: 'exec_command_end', call_id: 'c1', stderr: '', success: true } },
  ];
  fs.writeFileSync(filePath, `${lines.map(line => JSON.stringify(line)).join('\n')}\n`);

  const snapshot = parseCodexTranscript(filePath, { includeActivity: false });
  assert.equal(snapshot.session?.id, 's1');
  assert.deepEqual(snapshot.tools, []);
});

test('findCodexTranscript prefers current Codex thread id', () => {
  const originalHome = process.env.CODEX_HOME;
  const originalThread = process.env.CODEX_THREAD_ID;
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-home-'));
  const sessions = path.join(home, 'sessions', '2026', '04', '25');
  fs.mkdirSync(sessions, { recursive: true });
  const stale = path.join(sessions, 'rollout-stale-thread.jsonl');
  const current = path.join(sessions, 'rollout-current-thread.jsonl');
  fs.writeFileSync(stale, `${JSON.stringify({ timestamp: new Date().toISOString(), type: 'session_meta', payload: { cwd: '/repo' } })}\n`);
  fs.writeFileSync(current, `${JSON.stringify({ timestamp: new Date().toISOString(), type: 'session_meta', payload: { cwd: '/repo' } })}\n`);
  try {
    process.env.CODEX_HOME = home;
    process.env.CODEX_THREAD_ID = 'current-thread';
    assert.equal(findCodexTranscript('/repo'), current);
  } finally {
    if (originalHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = originalHome;
    if (originalThread === undefined) delete process.env.CODEX_THREAD_ID;
    else process.env.CODEX_THREAD_ID = originalThread;
  }
});

test('findCodexTranscript prefers explicit Codex transcript path', () => {
  const originalTranscript = process.env.CODEX_TRANSCRIPT_PATH;
  const originalThread = process.env.CODEX_THREAD_ID;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-transcript-path-'));
  const explicit = path.join(dir, 'current.jsonl');
  fs.writeFileSync(explicit, '');
  try {
    process.env.CODEX_TRANSCRIPT_PATH = explicit;
    process.env.CODEX_THREAD_ID = 'other-thread';
    assert.equal(findCodexTranscript('/repo'), explicit);
  } finally {
    if (originalTranscript === undefined) delete process.env.CODEX_TRANSCRIPT_PATH;
    else process.env.CODEX_TRANSCRIPT_PATH = originalTranscript;
    if (originalThread === undefined) delete process.env.CODEX_THREAD_ID;
    else process.env.CODEX_THREAD_ID = originalThread;
  }
});
