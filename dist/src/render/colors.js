const CODES = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m',
};
const NAMED_COLORS = {
    green: CODES.green,
    yellow: CODES.yellow,
    red: CODES.red,
    cyan: CODES.cyan,
    magenta: CODES.magenta,
    blue: CODES.blue,
};
function paint(text, code, config) {
    return config?.colors === false || process.env.NO_COLOR ? text : `${code}${text}${CODES.reset}`;
}
function trueColorCode(red, green, blue) {
    return `\x1b[38;2;${red};${green};${blue}m`;
}
function colorCode(value) {
    if (!value)
        return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'dim')
        return CODES.dim;
    if (normalized in NAMED_COLORS)
        return NAMED_COLORS[normalized];
    const hex = /^#?([0-9a-f]{6})$/i.exec(normalized);
    if (hex) {
        const raw = Number.parseInt(hex[1], 16);
        return trueColorCode((raw >> 16) & 0xff, (raw >> 8) & 0xff, raw & 0xff);
    }
    const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.exec(normalized);
    if (rgb) {
        const channels = rgb.slice(1).map(channel => Math.max(0, Math.min(255, Number.parseInt(channel, 10))));
        return trueColorCode(channels[0], channels[1], channels[2]);
    }
    return null;
}
function paintTheme(text, value, config) {
    const code = colorCode(value);
    return code ? paint(text, code, config) : text;
}
export const color = {
    dim: (text, config) => paint(text, CODES.dim, config),
    green: (text, config) => paint(text, CODES.green, config),
    yellow: (text, config) => paint(text, CODES.yellow, config),
    red: (text, config) => paint(text, CODES.red, config),
    cyan: (text, config) => paint(text, CODES.cyan, config),
    magenta: (text, config) => paint(text, CODES.magenta, config),
    blue: (text, config) => paint(text, CODES.blue, config),
    theme: (text, key, config) => paintTheme(text, config?.theme[key], config),
};
export function bar(percent, width, config) {
    const bounded = Math.max(0, Math.min(100, percent));
    const filled = Math.round((bounded / 100) * width);
    const raw = `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`;
    if (bounded >= 90)
        return color.red(raw, config);
    if (bounded >= 70)
        return color.yellow(raw, config);
    return color.green(raw, config);
}
//# sourceMappingURL=colors.js.map