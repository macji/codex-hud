export function emptyContext() {
    return {
        windowSize: null,
        usedTokens: null,
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        usedPercentage: null,
        remainingPercentage: null,
    };
}
export function emptyUsageLimits() {
    return {
        fiveHour: { usedPercentage: null, resetsAt: null },
        weekly: { usedPercentage: null, resetsAt: null },
    };
}
//# sourceMappingURL=types.js.map