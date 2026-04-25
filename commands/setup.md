---
description: Configure codex-hud for Codex CLI
allowed-tools: Bash, Read, Edit
---

# Setup codex-hud

1. Build the package: `npm install && npm run build`.
2. Preview safe config changes: `node dist/src/index.js --setup-dry-run`.
3. Apply safe config changes: `node dist/src/index.js --setup`.

`--setup` writes a timestamped `config.toml.codex-hud-backup-*` before changing an existing Codex config.

The configured Codex TUI status command is:

```toml
[tui]
status_line = []
status_line_command = "cd \"/path/to/codex-hud\" && CODEX_HUD_CURRENT_ONLY=1 node dist/src/index.js --status-line --color"
```

4. Restart Codex CLI so the TUI loads the new status command.
5. Verify HUD output:

```bash
node dist/src/index.js --json
node dist/src/index.js --status-line --no-color
node dist/src/index.js --watch
```

The standalone CLI works without a patched Codex build. The in-TUI footer requires Codex support for `[tui].status_line_command` and multi-line status output.
