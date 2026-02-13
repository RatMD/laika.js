import type { Plugin } from 'vite';

export default function laikaPlugin(): Plugin {
    return {
        name: 'laika-strip-october',
        enforce: 'pre',

        transform(code, id) {
            if (!id.endsWith('.vue')) {
                return null;
            }

            const pattern = /<october\b[^>]*>[\s\S]*?<\/october>/gi;
            if (!pattern.test(code)) {
                return null;
            }

            const stripped = code.replace(pattern, '');
            return {
                code: stripped,
                map: null,
            };
        }
    };
}
