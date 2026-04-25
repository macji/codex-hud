import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type LineLayout = 'compact' | 'expanded';
export type Language = 'en' | 'zh';
export type ContextValueMode = 'percent' | 'tokens' | 'remaining' | 'both';
export type GitMode = 'branch' | 'dirty' | 'full' | 'files';
export type HudElement = 'project' | 'context' | 'usage' | 'tools' | 'agents' | 'todos' | 'environment';

export interface ThemeConfig {
  model: string;
  context: string;
  label: string;
  separator: string;
  low: string;
  medium: string;
  high: string;
  critical: string;
}

export interface DisplayConfig {
  showProject: boolean;
  showGit: boolean;
  showContextBar: boolean;
  contextValue: ContextValueMode;
  showUsage: boolean;
  showTools: boolean;
  showAgents: boolean;
  showTodos: boolean;
  showSessionName: boolean;
  showSessionTokens: boolean;
  showDuration: boolean;
  showTokenBreakdown: boolean;
  showCodexVersion: boolean;
  gitMode: GitMode;
  customLine: string;
}

export interface HudConfig {
  lineLayout: LineLayout;
  showSeparators: boolean;
  language: Language;
  maxWidth: number;
  elementOrder: HudElement[];
  display: DisplayConfig;
  theme: ThemeConfig;
  colors: boolean;
}

const DEFAULT_ORDER: HudElement[] = ['project', 'context', 'usage', 'environment', 'tools', 'agents', 'todos'];

const DEFAULT_THEME: ThemeConfig = {
  model: '#CC9B1F',
  context: '#CC9B1F',
  label: '#CC9B1F',
  separator: '#CD7F32',
  low: '#8FBC8F',
  medium: '#FFD700',
  high: '#FF8C00',
  critical: '#FF6B6B',
};

export const DEFAULT_CONFIG: HudConfig = {
  lineLayout: 'expanded',
  showSeparators: false,
  language: 'en',
  maxWidth: 120,
  elementOrder: DEFAULT_ORDER,
  theme: DEFAULT_THEME,
  colors: true,
  display: {
    showProject: true,
    showGit: true,
    showContextBar: true,
    contextValue: 'percent',
    showUsage: true,
    showTools: false,
    showAgents: false,
    showTodos: false,
    showSessionName: false,
    showSessionTokens: false,
    showDuration: false,
    showTokenBreakdown: false,
    showCodexVersion: true,
    gitMode: 'dirty',
    customLine: '',
  },
};

export function getCodexHome(): string {
  return process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
}

export function getConfigPath(): string {
  return process.env.CODEX_HUD_CONFIG || path.join(getCodexHome(), 'codex-hud.json');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
}

function validateElementOrder(value: unknown): HudElement[] {
  if (!Array.isArray(value)) return DEFAULT_ORDER;
  const allowed = new Set(DEFAULT_ORDER);
  const order = value.filter((item): item is HudElement => typeof item === 'string' && allowed.has(item as HudElement));
  return order.length > 0 ? order : DEFAULT_ORDER;
}

function mergeTheme(value: unknown): ThemeConfig {
  if (!isRecord(value)) return { ...DEFAULT_THEME };
  return {
    model: asString(value.model, DEFAULT_THEME.model),
    context: asString(value.context, DEFAULT_THEME.context),
    label: asString(value.label, DEFAULT_THEME.label),
    separator: asString(value.separator, DEFAULT_THEME.separator),
    low: asString(value.low, DEFAULT_THEME.low),
    medium: asString(value.medium, DEFAULT_THEME.medium),
    high: asString(value.high, DEFAULT_THEME.high),
    critical: asString(value.critical, DEFAULT_THEME.critical),
  };
}

export function mergeConfig(input: unknown): HudConfig {
  if (!isRecord(input)) return structuredClone(DEFAULT_CONFIG);
  const displayInput = isRecord(input.display) ? input.display : {};
  return {
    lineLayout: oneOf(input.lineLayout, ['compact', 'expanded'] as const, DEFAULT_CONFIG.lineLayout),
    showSeparators: asBoolean(input.showSeparators, DEFAULT_CONFIG.showSeparators),
    language: oneOf(input.language, ['en', 'zh'] as const, DEFAULT_CONFIG.language),
    maxWidth: Math.max(40, Math.trunc(asNumber(input.maxWidth, DEFAULT_CONFIG.maxWidth))),
    elementOrder: validateElementOrder(input.elementOrder),
    theme: mergeTheme(input.theme),
    colors: asBoolean(input.colors, DEFAULT_CONFIG.colors),
    display: {
      showProject: asBoolean(displayInput.showProject, DEFAULT_CONFIG.display.showProject),
      showGit: asBoolean(displayInput.showGit, DEFAULT_CONFIG.display.showGit),
      showContextBar: asBoolean(displayInput.showContextBar, DEFAULT_CONFIG.display.showContextBar),
      contextValue: oneOf(displayInput.contextValue, ['percent', 'tokens', 'remaining', 'both'] as const, DEFAULT_CONFIG.display.contextValue),
      showUsage: asBoolean(displayInput.showUsage, DEFAULT_CONFIG.display.showUsage),
      showTools: asBoolean(displayInput.showTools, DEFAULT_CONFIG.display.showTools),
      showAgents: asBoolean(displayInput.showAgents, DEFAULT_CONFIG.display.showAgents),
      showTodos: asBoolean(displayInput.showTodos, DEFAULT_CONFIG.display.showTodos),
      showSessionName: asBoolean(displayInput.showSessionName, DEFAULT_CONFIG.display.showSessionName),
      showSessionTokens: asBoolean(displayInput.showSessionTokens, DEFAULT_CONFIG.display.showSessionTokens),
      showDuration: asBoolean(displayInput.showDuration, DEFAULT_CONFIG.display.showDuration),
      showTokenBreakdown: asBoolean(displayInput.showTokenBreakdown, DEFAULT_CONFIG.display.showTokenBreakdown),
      showCodexVersion: asBoolean(displayInput.showCodexVersion, DEFAULT_CONFIG.display.showCodexVersion),
      gitMode: oneOf(displayInput.gitMode, ['branch', 'dirty', 'full', 'files'] as const, DEFAULT_CONFIG.display.gitMode),
      customLine: asString(displayInput.customLine, DEFAULT_CONFIG.display.customLine).slice(0, 80),
    },
  };
}

export async function loadConfig(configPath = getConfigPath()): Promise<HudConfig> {
  try {
    const raw = await fs.promises.readFile(configPath, 'utf8');
    return mergeConfig(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export async function writeDefaultConfig(configPath = getConfigPath()): Promise<void> {
  await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
  await fs.promises.writeFile(configPath, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, { mode: 0o600 });
}
