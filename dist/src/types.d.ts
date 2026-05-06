import type { HudConfig } from './config.js';
export type ToolStatus = 'running' | 'completed' | 'error';
export type AgentStatus = 'running' | 'completed' | 'error';
export type TodoStatus = 'pending' | 'in_progress' | 'completed';
export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
}
export interface ContextInfo {
    windowSize: number | null;
    usedTokens: number | null;
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    usedPercentage: number | null;
    remainingPercentage: number | null;
}
export interface LimitWindow {
    usedPercentage: number | null;
    resetsAt: Date | null;
}
export interface UsageLimits {
    fiveHour: LimitWindow;
    weekly: LimitWindow;
}
export interface ToolEntry {
    id: string;
    name: string;
    target?: string;
    status: ToolStatus;
    startTime: Date;
    endTime?: Date;
}
export interface AgentEntry {
    id: string;
    type: string;
    model?: string;
    description?: string;
    status: AgentStatus;
    startTime: Date;
    endTime?: Date;
}
export interface TodoItem {
    content: string;
    status: TodoStatus;
}
export interface GitStatus {
    branch: string;
    dirty: boolean;
    ahead: number;
    behind: number;
    added: number;
    modified: number;
    deleted: number;
    untracked: number;
}
export interface SessionInfo {
    id?: string;
    name?: string;
    cwd: string;
    startedAt?: Date;
    duration?: string;
    totalTokens?: TokenUsage;
    transcriptPath?: string;
}
export interface HudSnapshot {
    model?: string;
    reasoningEffort?: string;
    projectName?: string;
    cwd: string;
    context: ContextInfo;
    usage: UsageLimits | null;
    git: GitStatus | null;
    tools: ToolEntry[];
    agents: AgentEntry[];
    todos: TodoItem[];
    session: SessionInfo;
    customLine?: string;
    codexVersion?: string;
}
export interface RenderContext {
    snapshot: HudSnapshot;
    config: HudConfig;
}
export interface RawStdinData {
    cwd?: string;
    model?: string | {
        id?: string;
        display_name?: string;
        name?: string;
    };
    reasoning_effort?: string | {
        level?: string | null;
    } | null;
    effort?: string | {
        level?: string | null;
    } | null;
    session_id?: string;
    session?: {
        id?: string;
        name?: string;
        started_at?: string | number | null;
    };
    context_window?: {
        context_window_size?: number | null;
        total_input_tokens?: number | null;
        used_tokens?: number | null;
        current_usage?: {
            input_tokens?: number | null;
            output_tokens?: number | null;
            cache_creation_input_tokens?: number | null;
            cache_read_input_tokens?: number | null;
        } | null;
        used_percentage?: number | null;
        remaining_percentage?: number | null;
    } | null;
    rate_limits?: {
        five_hour?: {
            used_percentage?: number | null;
            resets_at?: string | number | null;
        } | null;
        seven_day?: {
            used_percentage?: number | null;
            resets_at?: string | number | null;
        } | null;
        weekly?: {
            used_percentage?: number | null;
            resets_at?: string | number | null;
        } | null;
    } | null;
    tools?: ToolEntry[];
    agents?: AgentEntry[];
    todos?: TodoItem[];
    [key: string]: unknown;
}
export declare function emptyContext(): ContextInfo;
export declare function emptyUsageLimits(): UsageLimits;
//# sourceMappingURL=types.d.ts.map