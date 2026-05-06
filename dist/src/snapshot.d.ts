import { type HudSnapshot, type RawStdinData } from './types.js';
export interface BuildSnapshotOptions {
    includeActivity?: boolean;
    includeGit?: boolean;
    includeOmx?: boolean;
}
export declare function buildSnapshot(raw: RawStdinData | null, cwd?: string, options?: BuildSnapshotOptions): Promise<HudSnapshot>;
//# sourceMappingURL=snapshot.d.ts.map