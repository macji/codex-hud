#!/usr/bin/env node
import { loadConfig, writeDefaultConfig } from './config.js';
import { render, renderStatusLine } from './render/index.js';
import { runSetup } from './setup.js';
import { buildSnapshot } from './snapshot.js';
import { readStdin } from './stdin.js';
import { getCodexVersion } from './version.js';
function hasFlag(name) {
    return process.argv.includes(name);
}
function printHelp() {
    process.stdout.write(`codex-hud\n\nUsage:\n  codex-hud [--json] [--status-line] [--watch] [--setup] [--setup-dry-run] [--init-config] [--color] [--no-color]\n\nReads optional status JSON from stdin and renders a Codex HUD snapshot.\n`);
}
function flagValue(name, fallback) {
    const index = process.argv.indexOf(name);
    return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}
async function renderOnce(raw = null) {
    const statusLine = hasFlag('--status-line');
    const config = await loadConfig();
    const snapshot = await buildSnapshot(raw, process.cwd(), {
        includeActivity: !statusLine,
        includeGit: !statusLine,
        includeOmx: !statusLine,
    });
    if (!statusLine) {
        snapshot.codexVersion = snapshot.codexVersion ?? await getCodexVersion();
    }
    if (hasFlag('--json'))
        return `${JSON.stringify(snapshot, null, 2)}\n`;
    if (statusLine)
        return renderStatusLine({ snapshot, config });
    return render({ snapshot, config });
}
async function watch() {
    const intervalMs = Math.max(250, Number.parseInt(flagValue('--interval-ms', '1000'), 10) || 1000);
    let rendering = false;
    const draw = async () => {
        if (rendering)
            return;
        rendering = true;
        try {
            const output = await renderOnce(null);
            process.stdout.write(`\x1b[2J\x1b[H${output}`);
        }
        finally {
            rendering = false;
        }
    };
    await draw();
    const timer = setInterval(() => void draw(), intervalMs);
    const stop = () => {
        clearInterval(timer);
        process.stdout.write('\n');
        process.exit(0);
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
}
async function main() {
    if (hasFlag('--help') || hasFlag('-h')) {
        printHelp();
        return;
    }
    if (hasFlag('--init-config')) {
        await writeDefaultConfig();
        return;
    }
    if (hasFlag('--color'))
        delete process.env.NO_COLOR;
    if (hasFlag('--no-color'))
        process.env.NO_COLOR = '1';
    if (hasFlag('--setup') || hasFlag('--setup-dry-run')) {
        const result = await runSetup({ dryRun: hasFlag('--setup-dry-run') });
        process.stdout.write([
            `codex-hud setup ${result.dryRun ? 'dry-run' : 'complete'}`,
            `Codex config: ${result.configPath}`,
            `HUD config: ${result.hudConfigPath}`,
            `Status line: ${result.statusLine.join(', ')}`,
            result.backupPath ? `Backup: ${result.backupPath}` : undefined,
            `Changed: ${result.changed ? 'yes' : 'no'}`,
        ].filter(Boolean).join('\n') + '\n');
        return;
    }
    if (hasFlag('--watch')) {
        await watch();
        return;
    }
    const raw = await readStdin();
    process.stdout.write(await renderOnce(raw));
}
main().catch((error) => {
    process.stderr.write(`codex-hud: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
});
//# sourceMappingURL=index.js.map