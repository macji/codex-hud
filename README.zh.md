# Codex HUD

Codex HUD 是一个面向 OpenAI Codex CLI 会话的状态栏式 HUD。它把模型、推理强度、上下文窗口、限额用量、Git 状态、工具调用、子代理、待办事项和会话元信息放到终端里持续可见。

> 🌐 [English](README.md) | 中文文档

```text
gpt-5.5 high │ 96.5K/258.4K │ [███░░░░░░░] 37%
 ｜5h 3% | weekly 3%
```

Codex HUD 参考了 [Claude HUD](https://github.com/jarrodwatts/claude-hud) 的产品形态，但实现上适配 Codex CLI 的配置文件、JSONL transcript 和 TUI status surface。

## Codex HUD 是什么？

Codex HUD 用一个紧凑、常驻的视图展示 Codex 当前会话状态，避免你靠猜测判断模型、上下文和限额是否接近边界。

| 你能看到什么 | 为什么重要 |
| --- | --- |
| **模型 + 推理强度** | 直接确认当前使用的模型和 reasoning effort。 |
| **上下文用量** | 展示已用 token、上下文窗口大小和 10 格进度条。 |
| **限额用量** | Codex 暴露账号限额数据时展示 5 小时和 weekly 用量。 |
| **Git/项目状态** | 在完整 HUD 中展示分支、dirty 状态和文件变化。 |
| **工具、代理、待办** | 长任务中可以看到 agent 正在读写、搜索、调用哪些能力。 |
| **Codex 元信息** | 在可用时展示版本、会话 id、transcript 派生状态。 |

## 显示效果

### TUI 状态栏

默认 Codex TUI footer 针对窄终端优化：

```text
gpt-5.5 high │ 0/258.4K │ [░░░░░░░░░░] 0%
 ｜5h ? | weekly ?
```

当 Codex 拿到 rate-limit 数据后，第二行会自动更新：

```text
gpt-5.5 high │ 96.5K/258.4K │ [███░░░░░░░] 37%
 ｜5h 3% | weekly 3%
```

第二行故意以 `｜` 开头。这样即使某些终端或 TUI 把两行压成一行，也不会出现 `0%5h` 黏连：

```text
... [░░░░░░░░░░] 0% ｜5h 3% | weekly 3%
```

### 完整 CLI HUD

你也可以直接运行 CLI 查看更完整的 expanded snapshot：

```bash
node dist/src/index.js
node dist/src/index.js --json
node dist/src/index.js --watch
```

完整输出可按配置展示项目、上下文、用量、环境、工具、代理、待办和自定义行。

## 工作原理

Codex HUD 会合并多个本地数据源：

```text
Codex TUI → status_line_command env → codex-hud → stdout → Codex footer
       ↘ Codex config + model cache
       ↘ Codex JSONL transcript
       ↘ optional stdin payload
       ↘ local OMX state when present
```

关键行为：

- 从 `~/.codex/config.toml` 和 `~/.codex/models_cache.json` 读取模型和有效上下文窗口。
- 当 Codex 提供 transcript/session 环境变量时，从当前会话对应的 JSONL transcript 读取 token 用量。
- 在 `CODEX_HUD_CURRENT_ONLY=1` 下不会回退读取旧 workspace 历史，避免新窗口一打开就继承历史上下文数字。
- Codex 暴露 rate-limit 环境变量时，直接读取 5h/weekly 百分比。
- 支持 stdin JSON 适配，便于未来集成和脚本测试。
- 默认启用语义配色，主题参考本地 Hermes 状态栏配色。

## 环境要求

- Node.js 18 或更新版本。
- npm。
- Codex CLI。
- 若要在 Codex TUI footer 中显示增强状态栏，需要 Codex CLI 支持 `[tui].status_line_command`，并能向外部命令传递 session/rate-limit 环境数据。独立 `codex-hud` CLI 不依赖该补丁。

## 安装

### 从源码安装

```bash
git clone https://github.com/macji/codex-hud.git
cd codex-hud
npm install
npm run build
```

### 初始化 HUD 配置

```bash
node dist/src/index.js --init-config
```

配置文件位置：

```text
${CODEX_HUD_CONFIG:-${CODEX_HOME:-$HOME/.codex}/codex-hud.json}
```

### 配置 Codex TUI 状态栏

先预览将要写入的 Codex 配置：

```bash
node dist/src/index.js --setup-dry-run
```

确认后应用：

```bash
node dist/src/index.js --setup
```

`--setup` 会更新 `~/.codex/config.toml`，写入外部 status command；如果已有配置，会先生成带时间戳的备份。

期望的 Codex 配置形态：

```toml
[tui]
status_line = []
status_line_command = "cd \"/path/to/codex-hud\" && CODEX_HUD_CURRENT_ONLY=1 node dist/src/index.js --status-line --color"
```

执行 setup 后请重启 Codex CLI，让 TUI 读取新的 status command。

## 使用方式

### 状态栏渲染器

```bash
node dist/src/index.js --status-line
node dist/src/index.js --status-line --no-color
node dist/src/index.js --status-line --color
```

### 完整 HUD 渲染器

```bash
node dist/src/index.js
node dist/src/index.js --json
node dist/src/index.js --watch
```

### stdin 示例

```bash
echo '{"model":{"display_name":"gpt-5.4"},"context_window":{"context_window_size":200000,"current_usage":{"input_tokens":45000}},"rate_limits":{"five_hour":{"used_percentage":25},"seven_day":{"used_percentage":10}}}' \
  | node dist/src/index.js --status-line --no-color
```

## 配置

配置路径：

```text
${CODEX_HUD_CONFIG:-${CODEX_HOME:-$HOME/.codex}/codex-hud.json}
```

生成默认配置：

```bash
node dist/src/index.js --init-config
```

重要配置项：

| 配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `language` | `en` \| `zh` | `en` | 完整 HUD 标签语言。 |
| `lineLayout` | `expanded` \| `compact` | `expanded` | 完整 HUD 布局模式。 |
| `maxWidth` | number | `120` | 状态栏截断宽度。 |
| `colors` | boolean | `true` | 是否启用 ANSI 配色；`NO_COLOR` 会禁用颜色。 |
| `elementOrder` | string[] | project/context/usage/environment/tools/agents/todos | expanded 模式元素顺序。 |
| `display.showTools` | boolean | `false` | transcript 可用时展示工具活动。 |
| `display.showAgents` | boolean | `false` | 展示子代理活动。 |
| `display.showTodos` | boolean | `false` | 展示待办进度。 |
| `display.gitMode` | `branch` \| `dirty` \| `full` \| `files` | `dirty` | Git 信息详细程度。 |
| `display.contextValue` | `percent` \| `tokens` \| `remaining` \| `both` | `percent` | 完整 HUD 中上下文数值格式。 |
| `display.customLine` | string | `""` | 可选自定义行，最多 80 字符。 |

### 主题配色

Codex HUD 支持 ANSI 颜色名、hex 颜色和 `rgb(r,g,b)`。默认主题参考本地 Hermes 状态栏：

```json
{
  "theme": {
    "model": "#CC9B1F",
    "context": "#CC9B1F",
    "label": "#CC9B1F",
    "separator": "#CD7F32",
    "low": "#8FBC8F",
    "medium": "#FFD700",
    "high": "#FF8C00",
    "critical": "#FF6B6B"
  }
}
```

上下文进度条会按用量自动切换颜色：

- `low`：低于 50%。
- `medium`：50% 到 80%。
- `high`：高于 80%。
- `critical`：95% 及以上。

## 常见问题

### 状态栏没有出现

- 执行 `node dist/src/index.js --setup`。
- 确认 `~/.codex/config.toml` 中存在 `[tui].status_line_command`。
- setup 后重启 Codex CLI。
- 运行 `node dist/src/index.js --status-line --no-color` 验证渲染器本身是否正常。

### 第二行没有出现

- 确认重启的是重新构建后的 Codex。
- 确认当前 Codex build 支持多行 `status_line_command` 输出。
- 如果 Codex 尚未拿到限额数据，Codex HUD 仍会输出 `｜5h ? | weekly ?`；如果这个占位也没有出现，说明当前运行的 Codex 进程没有加载新的二进制或多行 footer 补丁。

### 新窗口一打开上下文用量很高

- setup 写入的命令包含 `CODEX_HUD_CURRENT_ONLY=1`，用于禁止读取旧 workspace transcript。
- 如果新窗口仍然很高，请确认配置命令包含 `CODEX_HUD_CURRENT_ONLY=1`，然后重启 Codex。

### 为什么上下文窗口是 `258.4K`，不是 `1M`？

Codex HUD 优先使用 Codex 本地 model cache。比如 `~/.codex/models_cache.json` 中某模型为 `272000 * 95%`，HUD 会显示 `258.4K`。如果当前 transcript 后续报告了不同的模型上下文窗口，transcript 数据可以覆盖配置推导值。

## 开发

```bash
npm install
npm run build
npm test
```

常用命令：

```bash
node dist/src/index.js --json
node dist/src/index.js --status-line --no-color
node dist/src/index.js --setup-dry-run
```

## License

MIT
