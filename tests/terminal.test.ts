import assert from 'node:assert/strict';
import test from 'node:test';
import { truncateVisible, visibleLength } from '../src/utils/terminal.js';

test('truncateVisible preserves ANSI reset when truncating colored text', () => {
  const output = truncateVisible('\x1b[31mabcdef\x1b[0m', 4);
  assert.equal(visibleLength(output), 4);
  assert.match(output, /^\x1b\[31ma\.\.\.\x1b\[0m$/);
});
