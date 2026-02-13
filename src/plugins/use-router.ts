import type { LaikaRouter, LaikaRouterHooks, LaikaRuntime, Props } from "../types";
import { inject } from "vue";
import { LAIKA_ROUTER_KEY } from "../symbols";

/**
 * Router Composable Creator
 * @param getRuntime 
 * @param hoks 
 * @returns 
 */
export function createRouter(getRuntime: () => LaikaRuntime | undefined, hooks: LaikaRouterHooks): LaikaRouter {
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
     * Prepare fetch Request
     * @param url 
     * @param options 
     * @returns 
     */
    function prepare(url: string, options: any = {}): Request {
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

        return new Request(url, {
            method: method.toUpperCase(),
            headers,
            body: method !== 'get' ? JSON.stringify(data ?? {}) : null,
            credentials: "same-origin",
        });;
    }

    /**
     * 
     * @param url 
     * @param options 
     */
    async function raw(url: string, options: any = {}): Promise<Response> {
        const request: Request = prepare(url, options);
        try {
            return await fetch(request);
        } catch (err) {
            throw err;
        }
    }

    /**
     * 
     * @param url 
     * @param options 
     */
    async function visit(url: string, options: any = {}): Promise<void> {
        const request: Request = prepare(url, options);

        // Handle Request
        let response;
        try {
            await hooks.onBefore(request);

            // Execute Request
            response = await fetch(request);

            // Handle History
            if (request.method === 'get') {
                if (options.replace) {
                    history.replaceState({}, "", url);
                } else {
                    history.pushState({}, "", url);
                }
            }

            // Hook
            await hooks.onSuccess(request, response);
        } catch (err) {
            await hooks.onFailure(err, request, response);
            throw err;
        }
    }

    // Export
    return {
        raw,
        visit,
        get: (url: string, options?: any) => visit(url, { ...(options ?? {}), method: "get" }),
        post: (url: string, data?: any, options?: any) => visit(url, { ...(options ?? {}), method: "post", data }),
        put: (url: string, data?: any, options?: any) => visit(url, { ...(options ?? {}), method: "put", data }),
        patch: (url: string, data?: any, options?: any) => visit(url, { ...(options ?? {}), method: "patch", data }),
        delete: (url: string, data?: any, options?: any) => visit(url, { ...(options ?? {}), method: "delete", data }),
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
