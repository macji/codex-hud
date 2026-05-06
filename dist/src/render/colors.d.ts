import type { HudConfig } from '../config.js';
export declare const color: {
    dim: (text: string, config?: HudConfig) => string;
    green: (text: string, config?: HudConfig) => string;
    yellow: (text: string, config?: HudConfig) => string;
    red: (text: string, config?: HudConfig) => string;
    cyan: (text: string, config?: HudConfig) => string;
    magenta: (text: string, config?: HudConfig) => string;
    blue: (text: string, config?: HudConfig) => string;
    theme: (text: string, key: keyof HudConfig["theme"], config?: HudConfig) => string;
};
export declare function bar(percent: number, width: number, config?: HudConfig): string;
//# sourceMappingURL=colors.d.ts.map