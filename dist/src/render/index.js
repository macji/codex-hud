import { getTerminalWidth, truncateVisible, visibleLength } from '../utils/terminal.js';
import { color } from './colors.js';
import { renderAgentsLine, renderContextLine, renderEnvironmentLine, renderProjectLine, renderTodosLine, renderToolsLine, renderUsageLine } from './session-line.js';
function renderElement(ctx, element) {
    switch (element) {
        case 'project': return renderProjectLine(ctx);
        case 'context': return renderContextLine(ctx);
        case 'usage': return renderUsageLine(ctx);
        case 'environment': return renderEnvironmentLine(ctx);
        case 'tools': return renderToolsLine(ctx);
        case 'agents': return renderAgentsLine(ctx);
        case 'todos': return renderTodosLine(ctx);
    }
}
function separator(width) {
    return '─'.repeat(Math.max(20, Math.min(width, 120)));
}
function compact(lines, maxWidth) {
    const joined = lines.join(' │ ');
    if (visibleLength(joined) <= maxWidth)
        return [joined];
    return [truncateVisible(joined, maxWidth)];
}
function expanded(ctx, maxWidth) {
    const lines = ctx.config.elementOrder
        .map(element => renderElement(ctx, element))
        .filter((line) => Boolean(line));
    if (ctx.config.display.customLine)
        lines.push(ctx.config.display.customLine);
    if (!ctx.config.showSeparators)
        return lines.map(line => truncateVisible(line, maxWidth));
    const firstActivity = lines.findIndex(line => line.includes('Tools') || line.includes('Agents') || line.includes('Todos') || line.includes('工具') || line.includes('代理') || line.includes('待办'));
    if (firstActivity <= 0)
        return lines.map(line => truncateVisible(line, maxWidth));
    return [
        ...lines.slice(0, firstActivity),
        separator(maxWidth),
        ...lines.slice(firstActivity),
    ].map(line => truncateVisible(line, maxWidth));
}
export function renderLines(ctx) {
    const maxWidth = Math.min(ctx.config.maxWidth, getTerminalWidth(ctx.config.maxWidth));
    const lines = expanded(ctx, maxWidth);
    const layout = ctx.config.lineLayout;
    return layout === 'compact' ? compact(lines, maxWidth) : lines;
}
export function render(ctx) {
    return `${renderLines(ctx).join('\n')}\n`;
}
function pct(value) {
    return value === null || value === undefined || !Number.isFinite(value) ? '?' : `${Math.round(value)}%`;
}
function contextPct(value) {
    return value === null || value === undefined || !Number.isFinite(value) ? '?' : `${Math.round(value)}%`;
}
function compactNumber(value) {
    if (value === null || value === undefined || !Number.isFinite(value))
        return '?';
    if (value >= 1_000_000)
        return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (value >= 1_000)
        return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return String(value);
}
function bounded(value) {
    return value === null || value === undefined || !Number.isFinite(value) ? 0 : Math.max(0, Math.min(100, value));
}
function rawStatusBar(percent, width) {
    const boundedPercent = bounded(percent);
    const filled = boundedPercent > 0 ? Math.max(1, Math.round((boundedPercent / 100) * width)) : 0;
    return `${'#'.repeat(filled)}${'-'.repeat(width - filled)}`;
}
function statusThemeKey(percent) {
    if (percent >= 95)
        return 'critical';
    if (percent > 80)
        return 'high';
    if (percent >= 50)
        return 'medium';
    return 'low';
}
function statusIndicatorText(value, usedTokens) {
    const boundedPercent = bounded(value);
    return `[${rawStatusBar(boundedPercent, 10)}] ${contextPct(value)}(${compactNumber(usedTokens)})`;
}
function usageWindow(label, value) {
    return `${label} ${pct(value)}`;
}
export function renderStatusLine(ctx) {
    const snapshot = ctx.snapshot;
    const contextUsed = bounded(snapshot.context.usedPercentage);
    const maxWidth = Math.min(ctx.config.maxWidth, getTerminalWidth(ctx.config.maxWidth));
    const model = [snapshot.model, snapshot.reasoningEffort].filter(Boolean).join(' ');
    const shownUsedTokens = snapshot.context.usedTokens ?? (snapshot.context.windowSize ? 0 : null);
    const parts = [
        model || null,
        statusIndicatorText(contextUsed, shownUsedTokens),
        usageWindow('5h', snapshot.usage?.fiveHour.usedPercentage),
        usageWindow('weekly', snapshot.usage?.weekly.usedPercentage),
    ].filter((part) => Boolean(part));
    const line = color.theme(parts.join(' | '), statusThemeKey(contextUsed), ctx.config);
    return `${truncateVisible(line, maxWidth)}\n`;
}
//# sourceMappingURL=index.js.map