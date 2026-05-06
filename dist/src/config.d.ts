export type LineLayout = 'compact' | 'expanded';
export type Language = 'en' | 'zh';
export type ContextValueMode = 'percent' | 'tokens' | 'remaining' | 'both';
export type GitMode = 'branch' | 'dirty' | 'full' | 'files';
export type HudElement = 'project' | 'context' | 'usage' | 'tools' | 'agents' | 'todos' | 'environment';
export interface ThemeConfig {
    model: string;
    context: string;
    label: string;
    separator: string;
    low: string;
    medium: string;
    high: string;
    critical: string;
}
export interface DisplayConfig {
    showProject: boolean;
    showGit: boolean;
    showContextBar: boolean;
    contextValue: ContextValueMode;
    showUsage: boolean;
    showTools: boolean;
    showAgents: boolean;
    showTodos: boolean;
    showSessionName: boolean;
    showSessionTokens: boolean;
    showDuration: boolean;
    showTokenBreakdown: boolean;
    showCodexVersion: boolean;
    gitMode: GitMode;
    customLine: string;
}
export interface HudConfig {
    lineLayout: LineLayout;
    showSeparators: boolean;
    language: Language;
    maxWidth: number;
    elementOrder: HudElement[];
    display: DisplayConfig;
    theme: ThemeConfig;
    colors: boolean;
}
export declare const DEFAULT_CONFIG: HudConfig;
export declare function getCodexHome(): string;
export declare function getConfigPath(): string;
export declare function mergeConfig(input: unknown): HudConfig;
export declare function loadConfig(configPath?: string): Promise<HudConfig>;
export declare function writeDefaultConfig(configPath?: string): Promise<void>;
//# sourceMappingURL=config.d.ts.map