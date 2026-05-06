const DEFAULT_FIRST_BYTE_TIMEOUT_MS = 200;
const DEFAULT_IDLE_TIMEOUT_MS = 30;
const DEFAULT_MAX_BYTES = 256 * 1024;
export async function readStdin(stream = process.stdin, options = {}) {
    if (stream.isTTY)
        return null;
    const firstByteTimeoutMs = options.firstByteTimeoutMs ?? DEFAULT_FIRST_BYTE_TIMEOUT_MS;
    const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    try {
        stream.setEncoding('utf8');
    }
    catch {
        return null;
    }
    return await new Promise((resolve) => {
        let raw = '';
        let settled = false;
        let firstByteTimer;
        let idleTimer;
        const cleanup = () => {
            if (firstByteTimer)
                clearTimeout(firstByteTimer);
            if (idleTimer)
                clearTimeout(idleTimer);
            stream.off('data', onData);
            stream.off('end', onEnd);
            stream.off('error', onError);
            stream.pause();
        };
        const finish = (value) => {
            if (settled)
                return;
            settled = true;
            cleanup();
            resolve(value);
        };
        const parse = () => {
            const trimmed = raw.trim();
            if (!trimmed)
                return null;
            try {
                const parsed = JSON.parse(trimmed);
                return typeof parsed === 'object' && parsed !== null ? parsed : null;
            }
            catch {
                return undefined;
            }
        };
        const scheduleIdleParse = () => {
            if (idleTimer)
                clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                const parsed = parse();
                finish(parsed === undefined ? null : parsed);
            }, idleTimeoutMs);
        };
        const onData = (chunk) => {
            raw += chunk;
            if (raw.length > maxBytes) {
                finish(null);
                return;
            }
            scheduleIdleParse();
        };
        const onEnd = () => {
            const parsed = parse();
            finish(parsed === undefined ? null : parsed);
        };
        const onError = () => finish(null);
        stream.on('data', onData);
        stream.on('end', onEnd);
        stream.on('error', onError);
        firstByteTimer = setTimeout(() => finish(null), firstByteTimeoutMs);
    });
}
//# sourceMappingURL=stdin.js.map