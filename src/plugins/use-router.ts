import type { LaikaRouter, LaikaRouterHooks, LaikaRuntime, Props } from "../types";
import { inject } from "vue";
import { LAIKA_ROUTER_KEY } from "../symbols";

/**
 * Router Composable Creator
 * @param getRuntime 
 * @param hoks 
 * @returns 
 */
export function createRouter(getRuntime: () => LaikaRuntime | undefined, hooks: LaikaRouterHooks) {
    /**
     * 
     * @returns 
     */
    function requireRuntime(): LaikaRuntime {
        const runtime = getRuntime();
        if (!runtime) {
            throw new Error("Laika Router: runtime not ready");
        }
        return runtime;
    }

    /**
     * 
     * @param url 
     * @param options 
     */
    async function visit(url: string, options: any = {}, returnResponse: boolean = false): Promise<Response> {
        const runtime: any = requireRuntime();
        const method = (options.method ?? "get").toLowerCase();
        const data = options.data ?? undefined;

        // Build Request
        const headers: Headers = new Headers({
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-Laika": "1",
            ...(options.headers ?? {}),
        });

        const token = runtime.payload?.()?.token
        if (token) {
            headers.set("X-Laika-Token", token);
        }
        if (options.force) {
            headers.set("X-Laika-Force", "1");
        }
        if (options.require?.length) {
            headers.set("X-Laika-Require", options.require.join(","));
        }
        if (options.only?.length) {
            headers.set("X-Laika-Only", options.only.join(","));
        }
        if (method !== "get") {
            headers.set('Content-Type', 'application/json');
        }

        // Handle Request
        const request: Request = new Request(url, {
            method: method.toUpperCase(),
            headers,
            body: method !== 'get' ? JSON.stringify(data ?? {}) : null,
            credentials: "same-origin",
        });

        // Handle Request
        const shouldHistory = method === "get";
        let response;
        try {
            if (!returnResponse) {
                hooks.onBefore(request);
            }

            // Execute Request
            response = await fetch(request);
            if (returnResponse) {
                return response;
            }

            // Handle History
            if (!returnResponse && shouldHistory) {
                if (options.replace) {
                    history.replaceState({}, "", url);
                } else {
                    history.pushState({}, "", url);
                }
            }

            // Hook
            if (!returnResponse) {
                hooks.onSuccess(request, response);
            }
        } catch (err) {
            if (!returnResponse) {
                hooks.onFailure(err, request, response);
            }
            throw err;
        }
        return response;
    }

    // Export
    return {
        visit,
        get: (url: string, options?: any, returnResponse?: boolean) => visit(url, { ...(options ?? {}), method: "get" }, returnResponse),
        post: (url: string, data?: any, options?: any, returnResponse?: boolean) => visit(url, { ...(options ?? {}), method: "post", data }, returnResponse),
        put: (url: string, data?: any, options?: any, returnResponse?: boolean) => visit(url, { ...(options ?? {}), method: "put", data }, returnResponse),
        patch: (url: string, data?: any, options?: any, returnResponse?: boolean) => visit(url, { ...(options ?? {}), method: "patch", data }, returnResponse),
        delete: (url: string, data?: any, options?: any, returnResponse?: boolean) => visit(url, { ...(options ?? {}), method: "delete", data }, returnResponse),
    };
}

/**
 * Provider Router
 * @param router 
 * @param app 
 */
export function provideRouter(router: any, app: any) {
    app.provide(LAIKA_ROUTER_KEY, router);
}

/**
 * Provide Composable Support
 * @returns 
 */
export function useRouter(): LaikaRouter {
    const router = inject<any>(LAIKA_ROUTER_KEY, null);
    if (!router) {
        throw new Error("useRouter(): Laika router not provided");
    }

    // Export Composable
    return router;
}
