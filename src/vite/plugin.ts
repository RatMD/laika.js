import type { Plugin, ResolvedConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { md5, merge } from './utils';

export interface LaikaViteConfig {
    i18n: {
        output: string;
        include: RegExp;
        functions: string[],
        writeOnDev: boolean;
        extraKeys: string[],
        extraGlobs: string[],
    },
    stripOctober: boolean;
}

export default function laikaPlugin(userConfig: Partial<LaikaViteConfig>): Plugin {
    const defaultConfig: LaikaViteConfig = {
        i18n: {
            output: 'resources/laika.i18n.json',
            functions: ['trans', 'trans_choice'],
            include: /\.vue|\.js|\.jsx|\.ts|\.tsx/,
            writeOnDev: true,
            extraKeys: [],
            extraGlobs: []
        },
        stripOctober: true,
    };
    const config = merge<LaikaViteConfig>(defaultConfig, userConfig);

    /**
     * Extract Locale Keys
     * @param code 
     * @param pattern 
     * @param out 
     */
    function extractLocaleKeys(code: string, pattern: RegExp, out: Set<string>) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(code))) {
            const key = match[2]?.trim();
            if (key) {
                out.add(key);
            }
        }
    }

    /**
     * Build Locale Json
     * @returns 
     */
    function buildLocaleFile() {
        const keys = new Set(collected);
        for (const key of config.i18n.extraKeys) {
            if (key?.trim()) {
                keys.add(key.trim());
            }
        }

        const sortedKeys = Array.from(keys).sort();
        const sortedGlobs = Array.from(
            new Set(config.i18n.extraGlobs.map(glob => glob.trim()).filter(Boolean))
        ).sort();

        return {
            version: 1,
            keys: [sortedKeys],
            globs: [sortedGlobs],
        };
    }
    
    /**
     * Write File
     * @returns 
     */
    function writeLocaleFile() {
        const outPath = path.resolve(viteConfig.root, config.i18n.output);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });

        const json = JSON.stringify(buildLocaleFile(), null, 2) + '\n';
        const newHash = md5(json);
        const oldHash = fs.existsSync(outPath) ? md5(fs.readFileSync(outPath, 'utf8')) : null;

        if (oldHash === newHash) {
            return;
        }

        fs.writeFileSync(outPath, json, 'utf8');
    }

    // Collect
    let viteConfig: ResolvedConfig;
    const collected = new Set<string>();
    const funcPattern = config.i18n.functions.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const callPattern = new RegExp(
        String.raw`(?:^|[^\w$])(?:${funcPattern})\(\s*(['"])([^'"]+?)\1`,
        'g'
    );

    // Return VITE Plugin
    return {
        name: 'laika-plugin',
        enforce: 'pre',

        /**
         * Vite Configuration resolved
         * @param resolved 
         */
        configResolved(resolved) {
            viteConfig = resolved;
        },

        /**
         * Transform Hook
         * @param code 
         * @param id 
         * @returns 
         */
        transform(code, id) {
            if (config.i18n.include.test(id)) {
                extractLocaleKeys(code, callPattern, collected);
            }

            if (config.stripOctober && id.endsWith('.vue')) {
                const pattern = /<october\b[^>]*>[\s\S]*?<\/october>/gi;
                if (pattern.test(code)) {
                    const stripped = code.replace(pattern, '');
                    return { code: stripped, map: null };
                }
            }

            return null;
        },

        /**
         * Handle HMR
         * @param ctx 
         * @returns 
         */
        handleHotUpdate(ctx) {
            if (!config.i18n.writeOnDev) {
                return;
            }
            if (!config.i18n.include.test(ctx.file)) {
                return;
            }

            try {
                writeLocaleFile();
            } catch { }
        },

        /**
         * Build Hook
         */
        buildEnd() {
            writeLocaleFile();
        },
    };
}
