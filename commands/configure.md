---
description: Configure codex-hud display options
allowed-tools: Bash, Read, Edit
---

# Configure codex-hud

Config lives at `${CODEX_HUD_CONFIG:-${CODEX_HOME:-$HOME/.codex}/codex-hud.json}`.

Useful toggles:

- `lineLayout`: `expanded` or `compact`.
- `showSeparators`: add a separator before activity lines.
- `language`: `en` or `zh`.
- `display.showTools`, `display.showAgents`, `display.showTodos`: enable activity lines.
- `display.gitMode`: `branch`, `dirty`, `full`, or `files`.
- `display.contextValue`: `percent`, `tokens`, `remaining`, or `both`.
- `display.customLine`: optional text line, max 80 chars.

Run `codex-hud --init-config` to create defaults, then edit the JSON file.
