export function getTerminalWidth(fallback = 120) {
    const columns = process.stdout.columns;
    if (typeof columns === 'number' && Number.isFinite(columns) && columns > 0)
        return columns;
    const envColumns = Number.parseInt(process.env.COLUMNS ?? '', 10);
    return Number.isFinite(envColumns) && envColumns > 0 ? envColumns : fallback;
}
export function stripAnsi(input) {
    return input.replace(/\x1b\[[0-9;]*m/g, '');
}
export function visibleLength(input) {
    return Array.from(stripAnsi(input)).reduce((sum, char) => sum + (char.codePointAt(0) > 0xff ? 2 : 1), 0);
}
export function truncateVisible(input, max) {
    if (visibleLength(input) <= max)
        return input;
    const chars = Array.from(stripAnsi(input));
    let output = '';
    let width = 0;
    for (const char of chars) {
        const next = char.codePointAt(0) > 0xff ? 2 : 1;
        if (width + next > Math.max(0, max - 1))
            break;
        output += char;
        width += next;
    }
    return `${output}…`;
}
//# sourceMappingURL=terminal.js.map