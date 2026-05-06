import type { RawStdinData } from './types.js';
type StdinStream = Pick<NodeJS.ReadStream, 'setEncoding' | 'on' | 'off' | 'pause'> & {
    isTTY?: boolean;
};
export interface ReadStdinOptions {
    firstByteTimeoutMs?: number;
    idleTimeoutMs?: number;
    maxBytes?: number;
}
export declare function readStdin(stream?: StdinStream, options?: ReadStdinOptions): Promise<RawStdinData | null>;
export {};
//# sourceMappingURL=stdin.d.ts.map