export declare const DEFAULT_CODEX_STATUS_LINE: string[];
export declare function defaultStatusLineCommand(entryPoint?: string, nodePath?: string): string;
export interface SetupResult {
    configPath: string;
    hudConfigPath: string;
    backupPath?: string;
    changed: boolean;
    dryRun: boolean;
    statusLine: string[];
    statusLineCommand?: string;
}
export declare function patchCodexConfigToml(input: string, statusLine?: string[], statusLineCommand?: string): {
    output: string;
    changed: boolean;
};
export declare function runSetup(options?: {
    dryRun?: boolean;
    statusLine?: string[];
}): Promise<SetupResult>;
//# sourceMappingURL=setup.d.ts.map