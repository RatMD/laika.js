import type { CurrencyOptions, LaikaRouter, LaikaRuntime, OctoberAPI, OctoberPayload, Props } from "../types";
import { inject } from "vue";
import { LAIKA_OCTOBER_KEY } from "../symbols";

/**
 * 
 * @param base 
 * @param path 
 * @returns 
 */
function joinUrl(base: string, path: string): string {
    if (!path) {
        return base;
    }
    if (/^(https?:)?\/\//.test(path)) {
        return path;
    }
    if (path.startsWith("#") || path.startsWith("mailto:") || path.startsWith("tel:") || path.startsWith("sms:")) {
        return path;
    }
    return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/**
 * 
 * @param params 
 * @returns 
 */
function encodeQuery(params: Record<string, any>) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) {
            continue;
        }
        qs.set(k, String(v));
    }
    const str = qs.toString();
    return str ? `?${str}` : "";
}

/**
 * 
 * @param pattern 
 * @param params 
 * @returns 
 */
function fillPattern(pattern: string, params: Record<string, any>) {
    return pattern.replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
        const val = params[key];
        return val == null ? "" : encodeURIComponent(String(val));
    });
}

/**
 * October Composable Creator
 * @param getRuntime 
 * @param router 
 * @returns 
 */
export function createOctober(getRuntime: () => LaikaRuntime | undefined, router: LaikaRouter): OctoberAPI {
    /**
     * 
     * @returns 
     */
    function requireRuntime(): LaikaRuntime {
        const runtime = getRuntime();
        if (!runtime) {
            throw new Error("October Functions: runtime not ready");
        }
        return runtime;
    }

    /**
     * 
     * @returns 
     */
    function boot(): OctoberPayload {
        const runtime: LaikaRuntime<Props, Props, Props> = requireRuntime();
        const october = runtime.payload?.october;
        if (!october) {
            throw new Error("October Functions: missing october payload.");
        }
        return october;
    }

    /**
     * |app TwigFilter
     * @param path 
     * @returns 
     */
    function app(path: string) {
        return joinUrl(boot().baseUrl, path);
    }

    /**
     * |theme TwigFilter (Probably unnecessary, since assets shouldn't be included this way).
     * @param path 
     * @returns 
     */
    function theme<T = string | string[]>(path: T): T {
        if (Array.isArray(path)) {
            return path.map(p => joinUrl(boot().themeBaseUrl, p ?? "")) as T;
        } else {
            return joinUrl(boot().themeBaseUrl, path as string) as T;
        }
    }

    /**
     * |page TwigFilter
     * @param name 
     * @param params 
     * @param persistence 
     * @returns 
     */
    function page(name: string | null = null, params: any = {}, persistence: boolean = true) {
        const oc = boot();
        const pages = oc.pages ?? {};
        const currentParams = oc.currentParams ?? {};

        if (typeof params === "boolean") {
            persistence = params;
            params = {};
        }
        if (!params || typeof params !== "object" || Array.isArray(params)) {
            params = {};
        }

        // Use current page
        if (!name) {
            const url = (requireRuntime() as any).url ?? "/";
            const merged = persistence ? { ...currentParams, ...params } : params;
            return url + encodeQuery(merged);
        }

        if (typeof name !== "string")  {
            return void 0;
        }

        name = name.toLowerCase();
        const pageInfo = pages[name];
        if (!pageInfo?.pattern)  {
            return void 0;
        }

        const merged = persistence ? { ...currentParams, ...params } : params;
        const path = fillPattern(pageInfo.pattern, merged);
        return app(path) + encodeQuery(merged);
    }

    /**
     * 
     * @param file 
     * @returns 
     */
    function media(file: string) {
        const oc = boot();
        const norm = "/" + String(file ?? "").replace(/\\/g, "/").replace(/^\/+/, "");
        const parts = norm.split("/").map((p) => encodeURIComponent(p));
        const encoded = parts.join("/").replace(/%2F/g, "/");
        return joinUrl(oc.mediaBaseUrl, encoded);
    }

    /**
     * 
     * @param input 
     * @param width 
     * @param height 
     * @param options 
     * @returns 
     */
    function resize(input: string, width: number | null = null, height: number | null = null, options: Record<string, any> = {}) {
        const oc = boot();
        const basePath = oc.resizer?.basePath ?? "/resize";

        const query: Record<string, any> = { src: input };
        if (width != null) {
            query.w = width;
        }
        if (height != null) {
            query.h = height;
        }
        for (const [key, val] of Object.entries(options ?? {})) {
            query[`o_${key}`] = val;
        }

        return app(basePath + encodeQuery(query));
    }

    /**
     * Handle currencies using JavaScripts native Intl.NumberFormat
     * @param value 
     * @param options 
     * @returns 
     */
    function currency(value: string | number, options: CurrencyOptions = {}) {
        const num = typeof value === "number" ? value : Number(String(value).replace(",", "."));
        if (!Number.isFinite(num)) {
            return String(value);
        }

        const {
            locale = "de-AT",
            currency = "EUR",
            style = "currency",
            minimumFractionDigits,
            maximumFractionDigits,
        } = options as any;

        return new Intl.NumberFormat(locale, {
            style,
            currency,
            minimumFractionDigits,
            maximumFractionDigits,
        }).format(num);
    }

    /**
     * |trans TwigFilter (TBI)
     * @param key 
     * @param replacements 
     * @returns 
     */
    function trans(key: string, replacements?: Record<string, unknown>) {
        return key;
    }

    /**
     * |trans_choice TwigFilter (TBI)
     * @param key 
     * @param number 
     * @param replacements 
     * @returns 
     */
    function trans_choice(key: string, number: number, replacements?: Record<string, unknown>) {
        return key;
    }

    /**
     * 
     * @param filter 
     * @param payload 
     * @returns 
     */
    async function callFilter(filter: string, payload: any) {
        const response = await router.raw('/x-laika/filter', {
            method: 'post',
            data: {
                filter, 
                payload
            }
        });
        if (!response.ok) {
            throw new Error(`October filter failed: ${filter}. (${response.status})`);
        }
        
        const data = await response.json();
        if (data.status !== 'success') {
            throw new Error(`October filter failed: ${filter}. (${response.status}) - (${data.message || 'An unknown error occurred.'})`);
        }

        return data.result.content as string;
    }

    // Export Octobers TwigFunctions
    return {
        app,
        theme,
        page,
        media,
        resize,
        currency,
        trans,
        trans_choice,
        _: trans,
        __: trans_choice,

        content: (markup) => callFilter("content", { markup }),
        md: (content) => callFilter("md", { content }),
        md_safe: (content) => callFilter("md_safe", { content }),
        md_clean: (content) => callFilter("md_clean", { content }),
        md_indent: (content) => callFilter("md_indent", { content }),
        placeholder: (key, fallback) => callFilter("placeholder", { key, fallback }),
    };
}

/**
 * Provider October
 * @param router 
 * @param app 
 */
export function provideOctober(router: any, app: any) {
    app.provide(LAIKA_OCTOBER_KEY, router);
}

/**
 * Provide Composable Support
 * @returns 
 */
export function useOctober() {
    const router = inject<any>(LAIKA_OCTOBER_KEY, null);
    if (!router) {
        throw new Error("useOctober(): OctoberAPI not provided");
    }

    // Export Composable
    return router;
}
