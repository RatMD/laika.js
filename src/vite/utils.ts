import crypto from 'node:crypto';

/**
 * Deep-Merge an object
 * @param target 
 * @param source 
 * @returns 
 */
export function merge<T, S = Partial<T>>(target: T, source: Partial<S>): T {
    for (const key in source) {
        const sourceValue = source[key];
        const targetValue = (target as any)[key];

        if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
            (target as any)[key] = merge(targetValue ?? {}, sourceValue as any);
        } else {
            (target as any)[key] = sourceValue;
        }
    }

    return target;
}

/**
 * 
 * @param input 
 * @returns 
 */
export function md5(input: string) {
    return crypto.createHash('md5').update(input).digest('hex');
}
