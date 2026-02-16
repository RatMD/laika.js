import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { md5, merge } from './utils';
import Extractor from './extractor';

export interface LaikaViteConfig {
    i18n: {
        output: string;
        include: RegExp;
        functions: string[];
        writeOnDev: boolean;
        extraKeys: string[];
    },
    stripOctober: boolean;
}

export type LaikaVitePartialConfig = Omit<Partial<LaikaViteConfig>, 'i18n'> & {
    i18n?: Partial<LaikaViteConfig['i18n']>;
};

export default function laikaPlugin(userConfig: LaikaVitePartialConfig = {}): Plugin {
    const defaultConfig: LaikaViteConfig = {
        i18n: {
            output: 'resources/laika.i18n.json',
            functions: ['trans', 'transChoice', 'trans_choice'],
            include: /(\.vue|\.js|\.jsx|\.ts|\.tsx)$/,
            writeOnDev: true,
            extraKeys: [],
        },
        stripOctober: true,
    };
    const config = merge<LaikaViteConfig, LaikaVitePartialConfig>(defaultConfig, userConfig);

    // States
    let viteConfig: ResolvedConfig;
    const funcPattern = config.i18n.functions.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const callPattern = new RegExp(
        String.raw`(?:^|[^\w$])(?:${funcPattern})\(\s*(['"])([^'"]+?)\1`,
        'g'
    );
    const extractor = new Extractor(callPattern);
    
    /**
     * Write File
     * @returns 
     */
    function writeLocaleFile() {
        const outPath = path.resolve(viteConfig.root, config.i18n.output);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });

        const json = JSON.stringify(extractor.toJson(config.i18n.extraKeys), null, 4) + '\n';
        const newHash = md5(json);
        const oldHash = fs.existsSync(outPath) ? md5(fs.readFileSync(outPath, 'utf8')) : null;

        if (oldHash === newHash) {
            return;
        }

        fs.writeFileSync(outPath, json, 'utf8');
    }

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
                extractor.extractFromFile(id, code);
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
         * Configure HMR Server
         * @param server
         * @returns
         */
        configureServer(server: ViteDevServer) {
            if (!config.i18n.writeOnDev) {
                return;
            }

            // Initial Scan
            extractor.scanFiles(viteConfig.root, config.i18n.include);
            writeLocaleFile();

            // Watch file changes
            const onChange = (file: string) => {
                if (!config.i18n.include.test(file)) {
                    return;
                }
                extractor.scanFile(file, config.i18n.include);
                writeLocaleFile();
            };
            server.watcher.on('add', onChange);
            server.watcher.on('change', onChange);

            // Watch file deletions
            const onUnlink = (file: string) => {
                if (!config.i18n.include.test(file)) {
                    return;
                }
                extractor.unsetFromFile(file);
                writeLocaleFile();
            };
            server.watcher.on('unlink', onUnlink);
        },

        /**
         * Build Hook
         */
        buildEnd() {
            writeLocaleFile();
        },
    };
}
