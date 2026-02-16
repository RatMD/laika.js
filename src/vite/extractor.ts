import fs from 'node:fs';
import path from 'node:path';

export default class Extractor {

    /**
     * RegExp pattern for locale functions
     */
    private pattern: RegExp;

    /**
     * Locale String Keys
     */
    private strings: Set<string>;

    /**
     * File -> Locale String Keys
     */
    private files: Map<string, Set<string>>;

    /**
     * 
     * @param pattern 
     */
    constructor(pattern: RegExp) {
        this.pattern = pattern;
        this.strings = new Set;
        this.files = new Map;
    }

    /**
     * Convert strings to JSON
     * @param extraKeys 
     * @param extraGlobs 
     * @returns 
     */
    public toJson(extraKeys: string[] = [], extraGlobs: string[] = []) {
        const keys = new Set(this.strings);
        for (const key of extraKeys) {
            if (key?.trim()) {
                keys.add(key.trim());
            }
        }

        const sortedKeys = Array.from(keys).sort();
        const sortedGlobs = Array.from(
            new Set(extraGlobs.map(glob => glob.trim()).filter(Boolean))
        ).sort();

        return {
            version: 1,
            keys: sortedKeys,
            globs: sortedGlobs,
        };
    }

    /**
     * Extract i18n keys from file
     * @param filePath 
     * @param code 
     */
    public extractFromFile(filePath: string, code: string) {
        this.unsetFromFile(filePath);

        const strings = this.extract(code);
        for (const key of strings) {
            this.strings.add(key);
        }

        this.files.set(filePath, strings);
    }

    /**
     * Extract i18n keys as Set
     * @param code 
     * @return
     */
    public extract(code: string): Set<string> {
        const result: Set<string> = new Set();
        this.pattern.lastIndex = 0;

        let match: RegExpExecArray | null;
        while ((match = this.pattern.exec(code))) {
            const key = match[2]?.trim();
            if (key) {
                result.add(key);
            }
        }

        return result;
    }

    /**
     * Remove cached i18n keys from on file
     * @param filePath 
     */
    public unsetFromFile(filePath: string) {
        const prev = this.files.get(filePath);
        if (prev) {
            for (const key of prev) {
                this.strings.delete(key);
            }
        }
    }

    /**
     * Scan a specific file
     * @param filePath 
     * @param include 
     * @returns 
     */
    public scanFile(filePath: string, include: RegExp) {
        if (!fs.existsSync(filePath)) {
            return;
        }
        if (include.test(filePath)) {
            return;
        }

        const code = fs.readFileSync(filePath, 'utf8');
        this.extractFromFile(filePath, code);
    }

    /**
     * Recursive file scanner
     * @param root 
     * @param include 
     */
    public scanFiles(root: string, include: RegExp) {
        const stack = [root];
        while (stack.length) {
            const dir = stack.pop()!;

            let entries: fs.Dirent[];
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            } catch {
                continue;
            }

            for (const entry of entries) {
                const entryPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name === 'node_modules' || entry.name === 'vendor' || entry.name === '.git') {
                        continue;
                    }
                    stack.push(entryPath);
                } else if (entry.isFile()) {
                    this.scanFile(entryPath, include);
                }
            }
        }
    }
}