import fs from 'node:fs';
import path from 'node:path';
import { getCodexHome } from '../config.js';
import { emptyContext, type HudSnapshot } from '../types.js';

function readConfigToml(): string {
  try {
    return fs.readFileSync(path.join(getCodexHome(), 'config.toml'), 'utf8');
  } catch {
    return '';
  }
}

function readQuotedValue(toml: string, key: string): string | undefined {
  const match = toml.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, 'm'));
  return match?.[1];
}

function readNumberValue(toml: string, key: string): number | null {
  const match = toml.match(new RegExp(`^${key}\\s*=\\s*(\\d+)`, 'm'));
  return match ? Number(match[1]) : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readModelsCacheContextWindow(model: string | undefined): number | null {
  if (!model) return null;
  try {
    const raw = fs.readFileSync(path.join(getCodexHome(), 'models_cache.json'), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const root = asRecord(parsed);
    const models = Array.isArray(parsed) ? parsed : Array.isArray(root?.models) ? root.models : Array.isArray(root?.data) ? root.data : [];
    const entry = models.map(asRecord).find(item => item?.slug === model || item?.id === model || item?.name === model);
    const contextWindow = typeof entry?.context_window === 'number' ? entry.context_window : null;
    const effectivePercent = typeof entry?.effective_context_window_percent === 'number' ? entry.effective_context_window_percent : 100;
    return contextWindow ? Math.round(contextWindow * effectivePercent / 100) : null;
  } catch {
    return null;
  }
}

export function snapshotFromCodexConfig(): Partial<HudSnapshot> {
  const toml = readConfigToml();
  const model = readQuotedValue(toml, 'model');
  const contextWindow = readNumberValue(toml, 'model_context_window') ?? readModelsCacheContextWindow(model);
  return {
    model,
    reasoningEffort: readQuotedValue(toml, 'model_reasoning_effort'),
    context: contextWindow ? { ...emptyContext(), windowSize: contextWindow } : undefined,
  };
}
