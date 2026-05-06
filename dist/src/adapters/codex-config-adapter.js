import fs from 'node:fs';
import path from 'node:path';
import { getCodexHome } from '../config.js';
import { emptyContext } from '../types.js';
function readConfigToml() {
    try {
        return fs.readFileSync(path.join(getCodexHome(), 'config.toml'), 'utf8');
    }
    catch {
        return '';
    }
}
function readQuotedValue(toml, key) {
    const match = toml.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, 'm'));
    return match?.[1];
}
function readNumberValue(toml, key) {
    const match = toml.match(new RegExp(`^${key}\\s*=\\s*(\\d+)`, 'm'));
    return match ? Number(match[1]) : null;
}
function asRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null;
}
function officialCodexContextWindow(model) {
    return model === 'gpt-5.5' ? 400_000 : null;
}
function readModelsCacheContextWindow(model) {
    if (!model)
        return null;
    const officialWindow = officialCodexContextWindow(model);
    if (officialWindow)
        return officialWindow;
    try {
        const raw = fs.readFileSync(path.join(getCodexHome(), 'models_cache.json'), 'utf8');
        const parsed = JSON.parse(raw);
        const root = asRecord(parsed);
        const models = Array.isArray(parsed) ? parsed : Array.isArray(root?.models) ? root.models : Array.isArray(root?.data) ? root.data : [];
        const entry = models.map(asRecord).find(item => item?.slug === model || item?.id === model || item?.name === model);
        const contextWindow = typeof entry?.context_window === 'number' ? entry.context_window : null;
        const effectivePercent = typeof entry?.effective_context_window_percent === 'number' ? entry.effective_context_window_percent : 100;
        return contextWindow ? Math.round(contextWindow * effectivePercent / 100) : null;
    }
    catch {
        return null;
    }
}
export function snapshotFromCodexConfig(modelOverride) {
    const toml = readConfigToml();
    const model = modelOverride ?? readQuotedValue(toml, 'model');
    const contextWindow = officialCodexContextWindow(model) ?? readNumberValue(toml, 'model_context_window') ?? readModelsCacheContextWindow(model);
    return {
        model,
        reasoningEffort: readQuotedValue(toml, 'model_reasoning_effort'),
        context: contextWindow ? { ...emptyContext(), windowSize: contextWindow } : undefined,
    };
}
//# sourceMappingURL=codex-config-adapter.js.map