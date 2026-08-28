import { readonly, ref, toValue, watch, type MaybeRefOrGetter } from "vue";
import { useOctober } from "./use-october";

export type OctoberFilterName = "md" | "md_safe" | "md_clean" | "md_indent";

const valueCache = new Map<string, string>();
const requestCache = new Map<string, Promise<string>>();

/**
 * 
 * @param name 
 * @param source 
 * @returns 
 */
export function useOctoberFilter(
    name: MaybeRefOrGetter<OctoberFilterName>,
    source: MaybeRefOrGetter<string>,
) {
    const october = useOctober();
    const value = ref("");
    const pending = ref(false);
    const error = ref<Error | null>(null);
    let revision = 0;

    /**
     * 
     */
    async function refresh(): Promise<void> {
        const currentRevision = ++revision;
        const filterName = toValue(name);
        const content = toValue(source) ?? "";
        const cacheKey = `${filterName}\u0000${content}`;

        pending.value = true;
        error.value = null;
        try {
            const cachedValue = valueCache.get(cacheKey);
            let result: string;

            if (cachedValue !== undefined) {
                result = cachedValue;
            } else {
                const cachedRequest = requestCache.get(cacheKey);
                const activeRequest = cachedRequest ?? october.filter(filterName, content);
                if (cachedRequest === undefined) {
                    requestCache.set(cacheKey, activeRequest);
                }

                result = await activeRequest;
                requestCache.delete(cacheKey);
                valueCache.set(cacheKey, result);
            }

            if (currentRevision === revision) {
                value.value = result;
            }
        } catch (reason) {
            requestCache.delete(cacheKey);
            if (currentRevision === revision) {
                error.value = reason instanceof Error ? reason : new Error(String(reason));
            }
        } finally {
            if (currentRevision === revision) {
                pending.value = false;
            }
        }
    }

    watch(
        () => [toValue(name), toValue(source)] as const,
        refresh,
        { immediate: true },
    );
    
    // Export
    return {
        value: readonly(value),
        pending: readonly(pending),
        error: readonly(error),
        refresh,
    };
}
