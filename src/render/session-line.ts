import path from 'node:path';
import type { RenderContext, TodoItem } from '../types.js';
import { truncateVisible } from '../utils/terminal.js';
import { bar, color } from './colors.js';
import { formatResetTime } from './format-reset-time.js';

const LABELS = {
  en: {
    context: 'Context', usage: 'Usage', weekly: '7d', project: 'Project', tools: 'Tools', agents: 'Agents', todos: 'Todos', tokens: 'Tokens', codex: 'Codex', duration: 'Time', model: 'Model', git: 'git', none: 'none',
  },
  zh: {
    context: '上下文', usage: '用量', weekly: '7天', project: '项目', tools: '工具', agents: '代理', todos: '待办', tokens: '令牌', codex: 'Codex', duration: '时长', model: '模型', git: 'git', none: '无',
  },
};

function labels(ctx: RenderContext): typeof LABELS.en {
  return LABELS[ctx.config.language];
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '?';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function percent(value: number | null | undefined): string {
  return value === null || value === undefined ? '?' : `${Math.round(value)}%`;
}

function todoCounts(todos: TodoItem[]): string {
  const done = todos.filter(todo => todo.status === 'completed').length;
  return `${done}/${todos.length}`;
}

export function renderProjectLine(ctx: RenderContext): string | null {
  if (!ctx.config.display.showProject) return null;
  const l = labels(ctx);
  const snapshot = ctx.snapshot;
  const pieces = [
    `${color.dim(l.project, ctx.config)} ${color.cyan(snapshot.projectName ?? path.basename(snapshot.cwd), ctx.config)}`,
  ];
  if (ctx.config.display.showGit && snapshot.git) {
    let git = `${l.git}:(${snapshot.git.branch}${snapshot.git.dirty ? '*' : ''}`;
    if (ctx.config.display.gitMode === 'full' || ctx.config.display.gitMode === 'files') {
      if (snapshot.git.ahead) git += ` ↑${snapshot.git.ahead}`;
      if (snapshot.git.behind) git += ` ↓${snapshot.git.behind}`;
    }
    git += ')';
    if (ctx.config.display.gitMode === 'files') {
      const stats = [`!${snapshot.git.modified}`, `+${snapshot.git.added}`, `-${snapshot.git.deleted}`, `?${snapshot.git.untracked}`].filter(part => !part.endsWith('0'));
      if (stats.length) git += ` ${stats.join(' ')}`;
    }
    pieces.push(color.magenta(git, ctx.config));
  }
  if (ctx.config.display.showSessionName && snapshot.session.name) pieces.push(snapshot.session.name);
  return pieces.join(' │ ');
}

export function renderContextLine(ctx: RenderContext): string | null {
  const l = labels(ctx);
  const c = ctx.snapshot.context;
  const used = c.usedPercentage;
  const parts = [color.dim(l.context, ctx.config)];
  if (ctx.config.display.showContextBar && used !== null) parts.push(bar(used, 10, ctx.config));
  switch (ctx.config.display.contextValue) {
    case 'tokens':
      parts.push(`${formatNumber(c.usedTokens)}/${formatNumber(c.windowSize)}`);
      break;
    case 'remaining':
      parts.push(`${percent(c.remainingPercentage)} remaining`);
      break;
    case 'both':
      parts.push(`${percent(used)} (${formatNumber(c.usedTokens)}/${formatNumber(c.windowSize)})`);
      break;
    default:
      parts.push(percent(used));
  }
  if (ctx.config.display.showTokenBreakdown) {
    parts.push(color.dim(`in:${formatNumber(c.inputTokens)} out:${formatNumber(c.outputTokens)} cache:${formatNumber(c.cacheReadTokens + c.cacheCreationTokens)}`, ctx.config));
  }
  return parts.join(' ');
}

export function renderUsageLine(ctx: RenderContext): string | null {
  if (!ctx.config.display.showUsage || !ctx.snapshot.usage) return null;
  const l = labels(ctx);
  const five = ctx.snapshot.usage.fiveHour;
  const weekly = ctx.snapshot.usage.weekly;
  if (five.usedPercentage === null && weekly.usedPercentage === null) return null;
  const windows: string[] = [];
  if (five.usedPercentage !== null) {
    windows.push(`${bar(five.usedPercentage, 6, ctx.config)} 5h:${percent(five.usedPercentage)}${five.resetsAt ? ` (${formatResetTime(five.resetsAt)})` : ''}`);
  }
  if (weekly.usedPercentage !== null) {
    windows.push(`${bar(weekly.usedPercentage, 6, ctx.config)} ${l.weekly}:${percent(weekly.usedPercentage)}${weekly.resetsAt ? ` (${formatResetTime(weekly.resetsAt)})` : ''}`);
  }
  return `${color.dim(l.usage, ctx.config)} ${windows.join(' │ ')}`;
}

export function renderEnvironmentLine(ctx: RenderContext): string | null {
  const l = labels(ctx);
  const parts: string[] = [];
  if (ctx.snapshot.model) parts.push(`${color.dim(l.model, ctx.config)} ${color.blue(ctx.snapshot.model, ctx.config)}${ctx.snapshot.reasoningEffort ? color.dim(`/${ctx.snapshot.reasoningEffort}`, ctx.config) : ''}`);
  if (ctx.config.display.showDuration && ctx.snapshot.session.duration) parts.push(`${color.dim(l.duration, ctx.config)} ${ctx.snapshot.session.duration}`);
  if (ctx.config.display.showCodexVersion && ctx.snapshot.codexVersion) parts.push(`${color.dim(l.codex, ctx.config)} ${ctx.snapshot.codexVersion}`);
  if (ctx.config.display.showSessionTokens && ctx.snapshot.session.totalTokens) {
    const tokens = ctx.snapshot.session.totalTokens;
    parts.push(`${color.dim(l.tokens, ctx.config)} in:${formatNumber(tokens.inputTokens)} out:${formatNumber(tokens.outputTokens)}`);
  }
  return parts.length ? parts.join(' │ ') : null;
}

export function renderToolsLine(ctx: RenderContext): string | null {
  if (!ctx.config.display.showTools || ctx.snapshot.tools.length === 0) return null;
  const l = labels(ctx);
  const entries = ctx.snapshot.tools.slice(-5).map(tool => {
    const icon = tool.status === 'running' ? '◐' : tool.status === 'error' ? '✗' : '✓';
    const target = tool.target ? `: ${truncateVisible(tool.target, 24)}` : '';
    return `${icon} ${tool.name}${target}`;
  });
  return `${color.dim(l.tools, ctx.config)} ${entries.join(' │ ')}`;
}

export function renderAgentsLine(ctx: RenderContext): string | null {
  if (!ctx.config.display.showAgents || ctx.snapshot.agents.length === 0) return null;
  const l = labels(ctx);
  const entries = ctx.snapshot.agents.slice(-4).map(agent => {
    const icon = agent.status === 'running' ? '◐' : agent.status === 'error' ? '✗' : '✓';
    const desc = agent.description ? `: ${truncateVisible(agent.description, 34)}` : '';
    return `${icon} ${agent.type}${agent.model ? ` [${agent.model}]` : ''}${desc}`;
  });
  return `${color.dim(l.agents, ctx.config)} ${entries.join(' │ ')}`;
}

export function renderTodosLine(ctx: RenderContext): string | null {
  if (!ctx.config.display.showTodos || ctx.snapshot.todos.length === 0) return null;
  const l = labels(ctx);
  const current = ctx.snapshot.todos.find(todo => todo.status === 'in_progress') ?? ctx.snapshot.todos.find(todo => todo.status === 'pending') ?? ctx.snapshot.todos.at(-1);
  return `${color.dim(l.todos, ctx.config)} ${todoCounts(ctx.snapshot.todos)} ${current ? `▸ ${truncateVisible(current.content, 52)}` : l.none}`;
}
