import type {
    CurrencyOptions,
    FlashObject,
    FlashTypes,
    LaikaPayload,
    LaikaRouter,
    LaikaRuntime,
    OctoberAPI,
    OctoberPayload,
    OctoberRequestOptions,
    OctoberRequestResult,
    Props,
} from "../types";
import { inject, reactive } from "vue";
import { LAIKA_OCTOBER_KEY } from "../symbols";
import { installLarajaxBridge } from "../larajax";

const FLASH_TYPES = new Set<FlashTypes>(["info", "error", "success", "warning"]);

/**
 * Normalize an October AJAX severity to a supported flash message type.
 * @param severity
 * @returns
 */
function normalizeFlashType(severity: unknown): FlashTypes {
    return typeof severity === "string" && FLASH_TYPES.has(severity as FlashTypes)
        ? severity as FlashTypes
        : "info";
}

/**
 * Add a message without discarding another message of the same type.
 * @param flash
 * @param type
 * @param message
 */
function appendFlashMessage(flash: FlashObject, type: FlashTypes, message: unknown): void {
    if (typeof message !== "string" || !message.trim()) {
        return;
    }

    const current = flash[type];
    const messages = Array.isArray(current) ? current : current ? [current] : [];
    const nextMessage = message.trim();

    if (!messages.includes(nextMessage)) {
        flash[type] = [...messages, nextMessage];
    }
}

/**
 * Convert October AJAX response feedback to LAIKA flash messages.
 * @param ajax
 * @returns
 */
function collectAjaxFlash(ajax: Record<string, any>): FlashObject {
    const flash: FlashObject = {};

    for (const operation of (ajax.ops ?? []) as Array<Record<string, any>>) {
        if (operation.op === "flash") {
            appendFlashMessage(
                flash,
                normalizeFlashType(operation.level ?? operation.severity),
                operation.text ?? operation.message,
            );
        }
    }

    const invalidMessages = Object.values(ajax.invalid ?? {})
        .flatMap((messages) => Array.isArray(messages) ? messages : [messages]);

    for (const message of invalidMessages) {
        appendFlashMessage(flash, "error", message);
    }

    if (Object.keys(flash).length === 0 && typeof ajax.message === "string") {
        appendFlashMessage(flash, normalizeFlashType(ajax.severity), ajax.message);
    }

    return flash;
}

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
    return pattern.replace(/:([A-Za-z0-9_]+\*?)/g, (_, key) => {
        const escapeSlash = key.endsWith('*');
        key = key.endsWith('*') ? key.slice(0, -1) : key;

        const val = params[key];
        delete params[key];

        if (val == null) {
            return '';
        }

        const encodedVal = encodeURIComponent(String(val));
        return escapeSlash ? encodedVal.replace(/%2F/g, '/') : encodedVal;
    });
}

/**
 * October Composable Creator
 * @param getRuntime 
 * @param router 
 * @param getRuntime 
 * @param router 
 * @param applyPayload 
 * @returns 
 */
export function createOctober(
    getRuntime: () => LaikaRuntime | undefined,
    router: LaikaRouter,
    applyPayload: (payload: Partial<LaikaPayload>, only: string[]) => Promise<void> | void,
): OctoberAPI {
    const placeholders = reactive({});

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
        const currentParams = { ...(oc.currentParams ?? {}) };

        if (typeof params === "boolean") {
            persistence = params;
            params = {};
        }
        if (!params || typeof params !== "object" || Array.isArray(params)) {
            params = {};
        }

        // Use current page
        if (!name) {
            const url = requireRuntime().payload?.page?.url ?? "/";
            const query = encodeQuery(params);
            if (!query) {
                return url;
            }

            return url + (url.includes("?") ? `&${query.slice(1)}` : query);
        }

        if (typeof name !== "string")  {
            return void 0;
        }

        name = name.toLowerCase();
        const pageInfo = pages[name];
        if (!pageInfo?.pattern)  {
            return void 0;
        }

        const routeParams = persistence ? { ...currentParams, ...params } : { ...params };
        const queryParams = { ...params };
        const path = fillPattern(pageInfo.pattern, routeParams);

        // Explicit parameters that do not belong to the target pattern are
        // query parameters. Persisted parameters only fill route placeholders.
        fillPattern(pageInfo.pattern, queryParams);

        return app(path) + encodeQuery(queryParams);
    }

    /**
     * |link TwigFilter
     * @param path 
     * @returns 
     */
    function link(path: string) {
        if (path.startsWith('http')) {
            return path;
        } else {
            const runtime = requireRuntime();
            return app(`/x-laika/resolve?path=${btoa(path)}&theme=${runtime.payload?.page?.theme || '0'}`);
        }
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
     * 
     * @internal Used for custom Laravel-alike translation system
     * @param key 
     * @returns 
     */
    function getLocalizationString(key: string): string|null {
        const runtime = requireRuntime();
        const locale = runtime.payload?.site?.locale || '';
        const fallbackLocale = runtime.payload?.october?.fallbackLocale || '';

        const localeStrings = runtime.payload?.october?.strings?.[locale] || {};
        const fallbackStrings = runtime.payload?.october?.strings?.[fallbackLocale] || {};

        if (key in localeStrings) {
            return localeStrings[key] as string;
        } else if (key in fallbackStrings) {
            return fallbackStrings[key] as string;
        } else {
            return null;
        }
    }

    /**
     * 
     * @internal Used for custom Laravel-alike translation system
     * @param string 
     * @param replacements 
     * @returns 
     */
    function transformLocalizationString(string: string, replacements?: Record<string, unknown>){
        if (!replacements) {
            return string;
        }

        for (const [rawKey, rawVal] of Object.entries(replacements)) {
            if (rawVal === undefined || rawVal === null) {
                continue;
            }

            const key = String(rawKey);
            const value = String(rawVal);

            // :key
            string = string.replaceAll(`:${key}`, value);

            // :Key (ucfirst)
            const uc = key.charAt(0).toUpperCase() + key.slice(1);
            string = string.replaceAll(`:${uc}`, value.charAt(0).toUpperCase() + value.slice(1));

            // :KEY (upper)
            string = string.replaceAll(`:${key.toUpperCase()}`, value.toUpperCase());
        }

        return string;
    }

    /**
     * 
     * @internal Used for custom Laravel-alike translation system
     * @param raw 
     * @param n 
     * @returns 
     */
    function choosePluralForm(raw: string, n: number): string {
        const parts = raw.split('|').map(s => s.trim()).filter(Boolean);

        for (const part of parts) {

            // explizit {0} text
            const exact = part.match(/^\{(\d+)\}\s*(.*)$/);
            if (exact) {
                const num = Number(exact[1]);
                if (n === num) {
                    return exact[2] as string;
                }
                continue;
            }

            // [2,*] text and [0,1] text
            const range = part.match(/^\[(\d+|\-?\*),(\d+|\-?\*)\]\s*(.*)$/);
            if (range) {
                const minRaw = range[1];
                const maxRaw = range[2];
                const text = range[3];

                const min = minRaw === '*' ? -Infinity : Number(minRaw);
                const max = maxRaw === '*' ? Infinity : Number(maxRaw);

                if (n >= min && n <= max) {
                    return text as string;
                }
                continue;
            }
        }

        // Fallback
        if (parts.length === 1) {
            return parts[0] as string;
        }

        // Simple singular|plural text
        if (parts.length === 2) {
            return (n === 1 ? parts[0] : parts[1]) as string;
        }

        // Latest part as "other"
        return parts[parts.length - 1] as string;
    }

    /**
     * |trans TwigFilter
     * @param key 
     * @param replacements 
     * @returns 
     */
    function trans(key: string, replacements?: Record<string, unknown>) {
        let localeString = getLocalizationString(key);
        if (localeString === null) {
            return key;
        }

        return transformLocalizationString(localeString, replacements);
    }

    /**
     * |trans_choice TwigFilter
     * @param key 
     * @param number 
     * @param replacements 
     * @returns 
     */
    function transChoice(key: string, number: number, replacements?: Record<string, unknown>) {
        let localeString = getLocalizationString(key);
        if (localeString === null) {
            return key;
        }

        const chosen = choosePluralForm(localeString, number);
        return transformLocalizationString(chosen, { count: number, ...replacements });
    }

    /**
     * 
     * @param name 
     * @param defaultValue 
     * @returns 
     */
    function placeholder(name: string, defaultValue: any = null): unknown {
        const runtime = requireRuntime();
        if (name in (runtime.payload?.page?.placeholders || {})) {
            return (runtime.payload?.page?.placeholders || {})[name];
        } else if (name in placeholders) {
            return placeholders[name];
        } else {
            return defaultValue;
        }
    }

    /**
     * 
     * @param name 
     * @returns 
     */
    function hasPlaceholder(name: string): boolean {
        const runtime = requireRuntime();
        return name in (runtime.payload?.page?.placeholders || {}) || name in placeholders;
    }

    /**
     * 
     * @param name 
     * @param value 
     * @returns 
     */
    function setPlaceholder(name: string, value: any): undefined {
        placeholders[name] = value;
    }

    /**
     * Execute a native October page or component AJAX handler.
     * @param handler 
     * @param options 
     * @returns 
     */
    async function request<T = Record<string, unknown>>(
        handler: string,
        options: OctoberRequestOptions = {},
    ): Promise<OctoberRequestResult<T>> {
        if (!/^(?:\w+::)?on[A-Z][\w+]*$/.test(handler)) {
            throw new Error(`October AJAX handler name is invalid: ${handler}`);
        }

        const only = options.only ?? ["token", "page.props", "page.flash", "components", "shared"];
        const headers: Record<string, string> = {
            "X-AJAX-HANDLER": handler,
            "X-AJAX-FLASH": options.flash === false ? "0" : "1",
        };
        if (options.partials?.length) {
            headers["X-AJAX-PARTIALS"] = options.partials.join("&");
        }

        const response = await router.raw(window.location.pathname + window.location.search, {
            method: "post",
            data: options.data ?? {},
            headers,
            only,
            preserveState: options.preserveState ?? true,
        });
        const json = await response.json() as Record<string, any>;
        const ajax = (json.__ajax ?? {}) as Record<string, any>;
        const nextPayload = json.__laika as Partial<LaikaPayload> | undefined;

        delete json.__ajax;
        delete json.__laika;

        if (nextPayload && options.flash !== false) {
            const ajaxFlash = collectAjaxFlash(ajax);
            if (Object.keys(ajaxFlash).length > 0 && nextPayload.page) {
                nextPayload.page.flash = {
                    ...(nextPayload.page.flash ?? {}),
                    ...ajaxFlash,
                };
            }
        }

        if (nextPayload) {
            await applyPayload(nextPayload, only);
        }

        const partials: Record<string, string> = {};
        for (const operation of (ajax.ops ?? []) as Array<Record<string, any>>) {
            if (operation.op === "partial" && typeof operation.name === "string") {
                partials[operation.name] = String(operation.html ?? "");
            } else if (operation.op === "dispatch" && typeof operation.event === "string") {
                window.dispatchEvent(new CustomEvent(operation.event, { detail: operation.detail }));
            } else if (operation.op === "redirect" && operation.url) {
                window.location.assign(String(operation.url));
            } else if (operation.op === "reload") {
                window.location.reload();
            }
        }

        if (!response.ok && !("ok" in ajax)) {
            throw new Error(`October AJAX request failed (${response.status}).`);
        }

        return {
            ok: ajax.ok ?? response.ok,
            status: response.status,
            data: json as T,
            invalid: ajax.invalid ?? {},
            message: ajax.message ?? null,
            severity: ajax.severity ?? "info",
            partials,
        };
    }

    /**
     * Render a trusted partial in the active October page context.
     * @param name 
     * @param parameters 
     * @returns 
     */
    async function renderPartial(name: string, parameters: Record<string, unknown> = {}): Promise<string> {
        const result = await request<{ html?: string }>("onLaikaRenderPartial", {
            data: { name, parameters },
            only: ["token"],
            preserveState: true,
        });
        if (!result.ok) {
            throw new Error(result.message ?? `Unable to render partial: ${name}`);
        }
        return result.data.html ?? "";
    }

    /**
     * Render a trusted content block in the active October page context.
     * @param name 
     * @param parameters 
     * @returns 
     */
    async function content(name: string, parameters: Record<string, unknown> = {}): Promise<string> {
        const result = await request<{ html?: string }>("onLaikaRenderContent", {
            data: { name, parameters },
            only: ["token"],
            preserveState: true,
        });
        if (!result.ok) {
            throw new Error(result.message ?? `Unable to render content: ${name}`);
        }
        return result.data.html ?? "";
    }

    /**
     * Limit visible HTML text while preserving the encountered element tree.
     * @param html 
     * @param maxLength 
     * @param end 
     * @returns 
     */
    function htmlLimit(html: string, maxLength: number = 100, end: string = "..."): string {
        if (maxLength <= 0) {
            return end;
        }

        const source = document.createElement("template");
        source.innerHTML = html;
        const output = document.createElement("div");
        let remaining = maxLength;
        let truncated = false;

        const cloneNode = (node: Node): Node | null => {
            if (truncated) {
                return null;
            }
            if (node.nodeType === Node.TEXT_NODE) {
                const characters = Array.from(node.textContent ?? "");
                if (characters.length <= remaining) {
                    remaining -= characters.length;
                    return document.createTextNode(characters.join(""));
                }

                truncated = true;
                return document.createTextNode(characters.slice(0, remaining).join("") + end);
            }
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return node.cloneNode(false);
            }

            const clone = node.cloneNode(false);
            for (const child of Array.from(node.childNodes)) {
                const childClone = cloneNode(child);
                if (childClone) {
                    clone.appendChild(childClone);
                }
                if (truncated) {
                    break;
                }
            }
            return clone;
        };

        for (const child of Array.from(source.content.childNodes)) {
            const clone = cloneNode(child);
            if (clone) {
                output.appendChild(clone);
            }
            if (truncated) {
                break;
            }
        }

        return output.innerHTML;
    }

    /**
     * 
     * @internal Used for lazy-loading content
     * @param filter 
     * @param payload 
     * @returns 
     */
    async function callFilter(filter: string, payload: any) {
        const response = await router.raw(app('/x-laika/filter'), {
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

    /**
     * @param name 
     * @param content 
     * @returns 
     */
    function filter(name: 'md' | 'md_safe' | 'md_clean' | 'md_indent', content: string) {
        return callFilter(name, { content });
    }

    // Export Octobers TwigFunctions
    const api: OctoberAPI = {
        app,
        theme,
        page,
        link,
        media,
        resize,
        currency,
        trans,
        transChoice,
        placeholder,
        hasPlaceholder,
        setPlaceholder,
        request,
        renderPartial,
        content,
        filter,
        htmlLimit,
        md: (content) => callFilter("md", { content }),
        mdSafe: (content) => callFilter("md_safe", { content }),
        mdClean: (content) => callFilter("md_clean", { content }),
        mdIndent: (content) => callFilter("md_indent", { content }),

        // PHP equivalent naming-conventions
        trans_choice: transChoice,
        md_safe: (content) => callFilter("md_safe", { content }),
        md_clean: (content) => callFilter("md_clean", { content }),
        md_indent: (content) => callFilter("md_indent", { content }),
    };

    installLarajaxBridge(api.request);

    return api;
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
