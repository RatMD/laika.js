import type { OctoberComponentHandle } from "../types";
import { computed } from "vue";
import { usePayload } from "../app";
import { useRouter } from "./use-router";

const cache = new Map<string, OctoberComponentHandle>();

export function useComponent(alias: string): OctoberComponentHandle {
    const existing = cache.get(alias);
    if (existing) {
        return existing;
    }

    // Composables
    const { components } = usePayload();
    const router = useRouter();

    // States
    const current = computed(() => components.value?.[alias] ?? null);

    /**
     * Component Property is loaded (exists within .props)
     * @param key 
     * @returns 
     */
    function loaded(key: string): boolean {
        const cur: any = current.value;
        if (!cur?.props) {
            return false;
        } else {
            return Object.prototype.hasOwnProperty.call(cur.props, key);
        }
    }

    /**
     * Component Property exists (may not be loaded though).
     * @param key 
     * @returns 
     */    
    function exists(key: string): boolean {
        const cur: any = current.value;
        if (!cur) {
            return false;
        }

        if (cur.props && (key in cur.props)) {
            return true;
        }

        // Check available methods and vars
        if (Array.isArray(cur.methods) && cur.methods.includes(key)) {
            return true;
        }
        if (Array.isArray(cur.vars) && cur.vars.includes(key)) {
            return true;
        }
        return false;
    }

    /**
     * Get component property or fallback
     * @param key 
     * @param fallback 
     * @returns 
     */
    function get<T = any>(key: string, fallback?: T): T {
        const cur: any = current.value;
        if (!cur?.props) {
            return fallback as T;
        } else {
            return (key in cur.props) ? (cur.props[key] as T) : (fallback as T);
        }
    }

    /**
     * Lazy-Load component property
     * @param keys 
     * @returns 
     */
    async function load(keys: string | string[]): Promise<void> {
        const list = Array.isArray(keys) ? keys : [keys];
        const missing = list.filter(key => !loaded(key));
        if (!missing.length) {
            return;
        }

        const only = missing.map(key => `components.${alias}.props.${key}`);
        await router.get(window.location.pathname + window.location.search, {
            only,
            preserveState: true,
            replace: true,
        });
    }

    const handle = new Proxy({} as OctoberComponentHandle, {
        get(_t, prop) {
            if (prop === "get") {
                return get;
            }
            if (prop === "load") {
                return load;
            }
            if (prop === "loaded") {
                return loaded;
            }
            if (prop === "exists") {
                return exists;
            }

            const cur: any = current.value;
            return cur ? cur[prop as any] : undefined;
        },
        has(_t, prop) {
            if (prop === "get" || prop === "load" || prop === "loaded" || prop === "exists") {
                return true;
            } else {
                const cur: any = current.value;
                return !!cur && prop in cur;
            }
        },
    });

    cache.set(alias, handle);
    return handle;
}
