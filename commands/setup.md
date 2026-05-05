---
description: Configure codex-hud for Codex CLI
allowed-tools: Bash, Read, Edit
---

# Setup codex-hud

1. Install the package: `npm install -g codex-hud`.
2. Preview safe config changes: `codex-hud --setup-dry-run`.
3. Apply safe config changes: `codex-hud --setup`.

`--setup` writes a timestamped `config.toml.codex-hud-backup-*` before changing an existing Codex config.

The configured Codex TUI status command is:

```toml
[tui]
status_line = []
status_line_command = "CODEX_HUD_CURRENT_ONLY=1 \"/path/to/node\" \"/path/to/codex-hud\" --status-line --color"
```

4. Restart Codex CLI so the TUI loads the new status command.
5. Verify HUD output:

```bash
codex-hud --json
codex-hud --status-line --no-color
codex-hud --watch
```

The standalone CLI works without a patched Codex build. The in-TUI footer requires Codex support for `[tui].status_line_command` and multi-line status output.
