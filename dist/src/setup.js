import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_CONFIG, getCodexHome, getConfigPath, writeDefaultConfig } from './config.js';
export const DEFAULT_CODEX_STATUS_LINE = [
    'model-with-reasoning',
    'git-branch',
    'context-used',
    'five-hour-limit',
    'weekly-limit',
];
function shellQuote(value) {
    return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}
export function defaultStatusLineCommand(entryPoint = process.argv[1] ?? path.join(process.cwd(), 'dist', 'src', 'index.js'), nodePath = process.execPath) {
    return `CODEX_HUD_CURRENT_ONLY=1 ${shellQuote(nodePath)} ${shellQuote(path.resolve(entryPoint))} --status-line --color`;
}
function statusLineToml(items) {
    return `status_line = [${items.map(item => `"${item}"`).join(', ')}]`;
}
function findTableRange(lines, tableName) {
    const tableHeader = `[${tableName}]`;
    const start = lines.findIndex(line => line.trim() === tableHeader);
    if (start === -1)
        return null;
    let end = lines.length;
    for (let index = start + 1; index < lines.length; index += 1) {
        const trimmed = lines[index].trim();
        if (/^\[[^\]]+\]$/.test(trimmed)) {
            end = index;
            break;
        }
    }
    return { start, end };
}
export function patchCodexConfigToml(input, statusLine = DEFAULT_CODEX_STATUS_LINE) {
    const normalizedInput = input.trimEnd();
    const lines = normalizedInput ? normalizedInput.split(/\r?\n/) : [];
    const desiredLine = statusLineToml(statusLine);
    const tuiRange = findTableRange(lines, 'tui');
    if (tuiRange) {
        let changed = false;
        const statusIndex = lines
            .slice(tuiRange.start + 1, tuiRange.end)
            .findIndex(line => /^\s*status_line\s*=/.test(line));
        if (statusIndex !== -1) {
            const actualIndex = tuiRange.start + 1 + statusIndex;
            if (lines[actualIndex] !== desiredLine) {
                lines[actualIndex] = desiredLine;
                changed = true;
            }
        }
        else {
            lines.splice(tuiRange.start + 1, 0, desiredLine);
            tuiRange.end += 1;
            changed = true;
        }
        const commandIndex = lines
            .slice(tuiRange.start + 1, tuiRange.end)
            .findIndex(line => /^\s*status_line_command\s*=/.test(line));
        if (commandIndex !== -1) {
            const actualIndex = tuiRange.start + 1 + commandIndex;
            lines.splice(actualIndex, 1);
            changed = true;
        }
        return { output: `${lines.join('\n')}\n`, changed };
    }
    const firstTuiSubtable = lines.findIndex(line => /^\s*\[tui\./.test(line));
    const block = ['[tui]', desiredLine, ''];
    if (firstTuiSubtable !== -1) {
        lines.splice(firstTuiSubtable, 0, ...block);
    }
    else {
        if (lines.length > 0 && lines.at(-1) !== '')
            lines.push('');
        lines.push('[tui]', desiredLine);
    }
    return { output: `${lines.join('\n')}\n`, changed: true };
}
function timestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}
async function ensureHudConfig(dryRun) {
    const hudConfigPath = getConfigPath();
    if (fs.existsSync(hudConfigPath))
        return hudConfigPath;
    if (!dryRun) {
        await fs.promises.mkdir(path.dirname(hudConfigPath), { recursive: true });
        await fs.promises.writeFile(hudConfigPath, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, { mode: 0o600 });
    }
    return hudConfigPath;
}
export async function runSetup(options = {}) {
    const dryRun = options.dryRun ?? false;
    const statusLine = options.statusLine ?? DEFAULT_CODEX_STATUS_LINE;
    const configPath = path.join(getCodexHome(), 'config.toml');
    const existing = await fs.promises.readFile(configPath, 'utf8').catch(() => '');
    const patched = patchCodexConfigToml(existing, statusLine);
    const hudConfigPath = await ensureHudConfig(dryRun);
    let backupPath;
    if (patched.changed && !dryRun) {
        await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
        if (existing) {
            backupPath = `${configPath}.codex-hud-backup-${timestamp()}`;
            await fs.promises.copyFile(configPath, backupPath);
        }
        await fs.promises.writeFile(configPath, patched.output, { mode: 0o600 });
    }
    if (!patched.changed && !fs.existsSync(hudConfigPath) && !dryRun) {
        await writeDefaultConfig(hudConfigPath);
    }
    return {
        configPath,
        hudConfigPath,
        backupPath,
        changed: patched.changed,
        dryRun,
        statusLine,
    };
}
//# sourceMappingURL=setup.js.map