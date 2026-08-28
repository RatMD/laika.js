import type { OctoberComponentHandle } from "../types";
import { computed, nextTick } from "vue";
import { payload } from "../state";
import { useRouter } from "./use-router";
import { useOctober } from "./use-october";

const cache = new Map<string, OctoberComponentHandle>();

export function useComponent(alias: string): OctoberComponentHandle {
    const existing = cache.get(alias);
    if (existing) {
        return existing;
    }

    // Composables
    const router = useRouter();
    const october = useOctober();

    // States
    const current = computed(() => payload.value?.components?.[alias] ?? null);

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
    async function load(keys: string | string[]): Promise<any> {
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
        await nextTick();

        if (Array.isArray(keys)) {
            return current.value?.props;
        } else {
            return current.value?.props[keys];
        }
    }

    /**
     * Lazy-load the component's native October-rendered markup.
     */
    async function loadHtml(): Promise<string> {
        if (current.value?.html !== undefined) {
            return current.value.html;
        }

        await router.get(window.location.pathname + window.location.search, {
            only: [`components.${alias}.html`],
            preserveState: true,
            replace: true,
        });
        await nextTick();

        return current.value?.html ?? "";
    }

    const handle = new Proxy({} as OctoberComponentHandle, {
        get(_t, prop) {
            if (prop === "get") {
                return get;
            }
            if (prop === "load") {
                return load;
            }
            if (prop === "loadHtml") {
                return loadHtml;
            }
            if (prop === "loaded") {
                return loaded;
            }
            if (prop === "exists") {
                return exists;
            }
            if (prop === "request") {
                return (handler: string, options?: any) => october.request(`${alias}::${handler}`, options);
            }

            const cur: any = current.value;
            return cur ? cur[prop as any] : undefined;
        },
        has(_t, prop) {
            if (prop === "get" || prop === "load" || prop === "loadHtml" || prop === "loaded" || prop === "exists" || prop === "request") {
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
