---
description: Configure codex-hud for Codex CLI
allowed-tools: Bash, Read, Edit
---

# Setup codex-hud

1. Install the package: `npm install -g codex-hud`.
2. Preview safe config changes: `codex-hud --setup-dry-run`.
3. Apply safe config changes: `codex-hud --setup`.

`--setup` writes a timestamped `config.toml.codex-hud-backup-*` before changing an existing Codex config.

The configured Codex TUI status line is:

```toml
[tui]
status_line = ["model-with-reasoning", "git-branch", "context-used", "five-hour-limit", "weekly-limit"]
```

4. Restart Codex CLI so the TUI loads the new status line.
5. Verify HUD output:

```bash
codex-hud --json
codex-hud --status-line --no-color
codex-hud --watch
```

The standalone CLI works independently. The in-TUI footer uses Codex's native `[tui].status_line` support.
