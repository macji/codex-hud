import { emptyContext, emptyUsageLimits } from '../types.js';
function numberOrNull(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function normalizeTokens(value) {
    return Math.max(0, Math.trunc(numberOrNull(value) ?? 0));
}
function parseDate(value) {
    if (typeof value !== 'string' && typeof value !== 'number')
        return null;
    const date = typeof value === 'number' && value < 10_000_000_000 ? new Date(value * 1000) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
function modelName(model) {
    if (typeof model === 'string')
        return model;
    if (model && typeof model === 'object')
        return model.display_name ?? model.name ?? model.id;
    return undefined;
}
function effortLevel(value) {
    if (typeof value === 'string')
        return value;
    if (value && typeof value === 'object' && typeof value.level === 'string')
        return value.level;
    return undefined;
}
function limits(raw) {
    if (!raw.rate_limits)
        return null;
    const usage = emptyUsageLimits();
    usage.fiveHour = {
        usedPercentage: numberOrNull(raw.rate_limits.five_hour?.used_percentage),
        resetsAt: parseDate(raw.rate_limits.five_hour?.resets_at),
    };
    const weekly = raw.rate_limits.weekly ?? raw.rate_limits.seven_day;
    usage.weekly = {
        usedPercentage: numberOrNull(weekly?.used_percentage),
        resetsAt: parseDate(weekly?.resets_at),
    };
    return usage;
}
export function snapshotFromStdin(raw, cwd = process.cwd()) {
    if (!raw)
        return {};
    const context = emptyContext();
    const current = raw.context_window?.current_usage;
    context.windowSize = numberOrNull(raw.context_window?.context_window_size);
    context.inputTokens = normalizeTokens(current?.input_tokens ?? raw.context_window?.total_input_tokens);
    context.outputTokens = normalizeTokens(current?.output_tokens);
    context.cacheCreationTokens = normalizeTokens(current?.cache_creation_input_tokens);
    context.cacheReadTokens = normalizeTokens(current?.cache_read_input_tokens);
    context.usedTokens = numberOrNull(raw.context_window?.used_tokens)
        ?? context.inputTokens + context.outputTokens + context.cacheCreationTokens + context.cacheReadTokens;
    context.usedPercentage = numberOrNull(raw.context_window?.used_percentage)
        ?? (context.windowSize && context.usedTokens !== null ? (context.usedTokens / context.windowSize) * 100 : null);
    context.remainingPercentage = numberOrNull(raw.context_window?.remaining_percentage)
        ?? (context.usedPercentage === null ? null : Math.max(0, 100 - context.usedPercentage));
    return {
        model: modelName(raw.model),
        reasoningEffort: effortLevel(raw.reasoning_effort) ?? effortLevel(raw.effort),
        cwd: raw.cwd ?? cwd,
        context,
        usage: limits(raw),
        tools: Array.isArray(raw.tools) ? raw.tools : undefined,
        agents: Array.isArray(raw.agents) ? raw.agents : undefined,
        todos: Array.isArray(raw.todos) ? raw.todos : undefined,
        session: {
            cwd: raw.cwd ?? cwd,
            id: raw.session?.id ?? raw.session_id,
            name: raw.session?.name,
            startedAt: parseDate(raw.session?.started_at) ?? undefined,
        },
    };
}
//# sourceMappingURL=stdin-adapter.js.map