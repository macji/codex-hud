// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_PATTERN = /^(?:\x1b\[[0-9;]*m|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\))/;
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_GLOBAL = /(?:\x1b\[[0-9;]*m|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\))/g;
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_ANY = /(?:\x1b\[[0-9;]*m|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\))/;
const ANSI_RESET = '\x1b[0m';
const GRAPHEME_SEGMENTER = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;
export function getTerminalWidth(fallback = 120) {
    const stdoutColumns = process.stdout.columns;
    if (typeof stdoutColumns === 'number' && Number.isFinite(stdoutColumns) && stdoutColumns > 0)
        return stdoutColumns;
    const envColumns = Number.parseInt(process.env.COLUMNS ?? '', 10);
    if (Number.isFinite(envColumns) && envColumns > 0)
        return envColumns;
    const stderrColumns = process.stderr.columns;
    if (typeof stderrColumns === 'number' && Number.isFinite(stderrColumns) && stderrColumns > 0)
        return stderrColumns;
    return fallback;
}
export function stripAnsi(input) {
    return input.replace(ANSI_ESCAPE_GLOBAL, '');
}
function segmentGraphemes(text) {
    if (!text)
        return [];
    if (!GRAPHEME_SEGMENTER)
        return Array.from(text);
    return Array.from(GRAPHEME_SEGMENTER.segment(text), segment => segment.segment);
}
function isWideCodePoint(codePoint) {
    return codePoint >= 0x1100 && (codePoint <= 0x115f ||
        codePoint === 0x2329 ||
        codePoint === 0x232a ||
        (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
        (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
        (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
        (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
        (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
        (codePoint >= 0xff00 && codePoint <= 0xff60) ||
        (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
        (codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
        (codePoint >= 0x20000 && codePoint <= 0x3fffd));
}
function graphemeWidth(grapheme) {
    if (!grapheme || /^\p{Control}$/u.test(grapheme))
        return 0;
    if (/\p{Extended_Pictographic}/u.test(grapheme))
        return 2;
    let hasVisibleBase = false;
    let width = 0;
    for (const char of Array.from(grapheme)) {
        if (/^\p{Mark}$/u.test(char) || char === '\u200d' || char === '\ufe0f')
            continue;
        hasVisibleBase = true;
        const codePoint = char.codePointAt(0);
        width = Math.max(width, codePoint !== undefined && isWideCodePoint(codePoint) ? 2 : 1);
    }
    return hasVisibleBase ? width : 0;
}
export function visibleLength(input) {
    let width = 0;
    let index = 0;
    while (index < input.length) {
        const ansiMatch = ANSI_ESCAPE_PATTERN.exec(input.slice(index));
        if (ansiMatch) {
            index += ansiMatch[0].length;
            continue;
        }
        let nextAnsiIndex = index;
        while (nextAnsiIndex < input.length && !ANSI_ESCAPE_PATTERN.exec(input.slice(nextAnsiIndex))) {
            nextAnsiIndex += 1;
        }
        for (const grapheme of segmentGraphemes(input.slice(index, nextAnsiIndex))) {
            width += graphemeWidth(grapheme);
        }
        index = nextAnsiIndex;
    }
    return width;
}
function hasAnsi(input) {
    return ANSI_ESCAPE_ANY.test(input);
}
export function truncateVisible(input, max) {
    if (max <= 0)
        return hasAnsi(input) ? ANSI_RESET : '';
    if (visibleLength(input) <= max)
        return input;
    const suffix = max >= 3 ? '...' : '.'.repeat(max);
    const keepWidth = Math.max(0, max - suffix.length);
    let output = '';
    let width = 0;
    let index = 0;
    let done = false;
    const inputHasAnsi = hasAnsi(input);
    while (index < input.length && !done) {
        const ansiMatch = ANSI_ESCAPE_PATTERN.exec(input.slice(index));
        if (ansiMatch) {
            output += ansiMatch[0];
            index += ansiMatch[0].length;
            continue;
        }
        let nextAnsiIndex = index;
        while (nextAnsiIndex < input.length && !ANSI_ESCAPE_PATTERN.exec(input.slice(nextAnsiIndex))) {
            nextAnsiIndex += 1;
        }
        for (const grapheme of segmentGraphemes(input.slice(index, nextAnsiIndex))) {
            const nextWidth = graphemeWidth(grapheme);
            if (width + nextWidth > keepWidth) {
                done = true;
                break;
            }
            output += grapheme;
            width += nextWidth;
        }
        index = nextAnsiIndex;
    }
    return `${output}${suffix}${inputHasAnsi ? ANSI_RESET : ''}`;
}
//# sourceMappingURL=terminal.js.map