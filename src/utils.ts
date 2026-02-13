/**
 *
 * @param mod
 * @returns
 */
export function unwrapModule<T>(mod: any): T {
    return mod?.default ?? mod;
}

/**
 *
 * @param header
 * @returns
 */
export function parseOnlyHeader(header: string | null): string[] {
    if (!header) {
        return [];
    } else {
        return header.split(',').map(s => s.trim()).filter(Boolean);
    }
}

/**
 *
 * @param obj
 * @param path
 * @returns
 */
export function getByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/**
 *
 * @param root
 * @param path
 * @param value
 */
export function setByPath(root: any, path: string, value: any) {
    const parts = path.split('.');
    if (!parts.length) {
        return root;
    }

    const out = Array.isArray(root) ? root.slice() : { ...(root ?? {}) };
    const last = parts[parts.length - 1];

    let curOut: any = out;
    let curIn: any = root ?? {};

    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i] as string;

        const nextIn = curIn?.[key];
        let nextOut: any;

        if (Array.isArray(nextIn)) {
            nextOut = nextIn.slice();
        } else if (nextIn && typeof nextIn === 'object') {
            nextOut = { ...nextIn };
        } else {
            nextOut = {};
        }

        curOut[key] = nextOut;
        curOut = nextOut;
        curIn = nextIn;
    }

    curOut[last as string] = value;
    return out;
}
