import { type HudSnapshot } from '../types.js';
export interface ParseCodexTranscriptOptions {
    includeActivity?: boolean;
}
export declare function findCodexTranscript(cwd?: string, sessionId?: string | undefined, transcriptPath?: string | undefined): string | null;
export declare function parseCodexTranscript(transcriptPath: string, options?: ParseCodexTranscriptOptions): Partial<HudSnapshot>;
export declare function snapshotFromCodexTranscript(cwd?: string, options?: ParseCodexTranscriptOptions): Partial<HudSnapshot>;
//# sourceMappingURL=codex-transcript-adapter.d.ts.map