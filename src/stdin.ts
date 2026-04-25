import type { RawStdinData } from './types.js';

type StdinStream = Pick<NodeJS.ReadStream, 'setEncoding' | 'on' | 'off' | 'pause'> & { isTTY?: boolean };

export interface ReadStdinOptions {
  firstByteTimeoutMs?: number;
  idleTimeoutMs?: number;
  maxBytes?: number;
}

const DEFAULT_FIRST_BYTE_TIMEOUT_MS = 200;
const DEFAULT_IDLE_TIMEOUT_MS = 30;
const DEFAULT_MAX_BYTES = 256 * 1024;

export async function readStdin(stream: StdinStream = process.stdin, options: ReadStdinOptions = {}): Promise<RawStdinData | null> {
  if (stream.isTTY) return null;
  const firstByteTimeoutMs = options.firstByteTimeoutMs ?? DEFAULT_FIRST_BYTE_TIMEOUT_MS;
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  try {
    stream.setEncoding('utf8');
  } catch {
    return null;
  }

  return await new Promise((resolve) => {
    let raw = '';
    let settled = false;
    let firstByteTimer: ReturnType<typeof setTimeout> | undefined;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = (): void => {
      if (firstByteTimer) clearTimeout(firstByteTimer);
      if (idleTimer) clearTimeout(idleTimer);
      stream.off('data', onData);
      stream.off('end', onEnd);
      stream.off('error', onError);
      stream.pause();
    };

    const finish = (value: RawStdinData | null): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const parse = (): RawStdinData | null | undefined => {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return typeof parsed === 'object' && parsed !== null ? parsed as RawStdinData : null;
      } catch {
        return undefined;
      }
    };

    const scheduleIdleParse = (): void => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        const parsed = parse();
        finish(parsed === undefined ? null : parsed);
      }, idleTimeoutMs);
    };

    const onData = (chunk: string): void => {
      raw += chunk;
      if (raw.length > maxBytes) {
        finish(null);
        return;
      }
      scheduleIdleParse();
    };
    const onEnd = (): void => {
      const parsed = parse();
      finish(parsed === undefined ? null : parsed);
    };
    const onError = (): void => finish(null);

    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('error', onError);
    firstByteTimer = setTimeout(() => finish(null), firstByteTimeoutMs);
  });
}
