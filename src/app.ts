import type {
    ComponentsFacade,
    LaikaAppComponent,
    LaikaPayload,
    LaikaPayloadRefs,
    LaikaRouter,
    LaikaRuntime,
    LaikaVuePlugin,
    OctoberAPI,
    OctoberComponentHandle,
    Props,
    ResolvedComponent,
    ResolveResult,
} from "./types";
import {
    type DefineComponent,
    type PropType,
    type VNode,
    computed,
    defineComponent,
    h,
    markRaw,
    reactive,
    ref,
    shallowRef,
    Fragment,
} from "vue";
import { ProgressBar } from "./components/progress-bar";
import { createOctober, provideOctober } from "./plugins/use-october";
import { getProgressBar } from "./plugins/get-progress-bar";
import { getByPath, parseOnlyHeader, setByPath, unwrapModule } from "./utils";
import { createRouter, provideRouter } from "./plugins/use-router";
import { useComponent } from "./plugins/use-component";

// States
const component = shallowRef<DefineComponent>();
const payload = shallowRef<LaikaPayload>();
const layout = shallowRef<any>(null);
const key = ref<number | undefined>(undefined);

// Runtime
const runtime: LaikaRuntime = {
    get component() { return component.value; },
    get payload() { return payload.value; },
    get layout() { return layout.value; },
    get key() { return key.value; },
    title: (title: string) => title,
    resolver: () => { throw new Error('not implemented') },
    getLayout: () => layout.value,
    setLayout: (next: any) => { layout.value = next; },
};

// Extensions
let router: LaikaRouter | undefined;
let october: OctoberAPI | undefined;


export const App: LaikaAppComponent = defineComponent({
    /**
     * Component Name
     */
    name: "Laika",

    /**
     * Component Properties
     */
    props: {
        initialPayload: {
            type: Object as PropType<LaikaPayload>,
            required: true
        },
        initialComponent: {
            type: Object as PropType<DefineComponent>,
            required: false,
        },
        resolveComponent: {
            type: Function as PropType<(name: string) => ResolveResult>,
            required: true,
        },
        title: {
            type: Function as PropType<(title: string) => string>,
            required: false,
            default: (t: string) => t,
        },
    },

    /**
     * Setup Laika Application
     * @param props
     * @returns
     */
    setup({ initialPayload, initialComponent, resolveComponent, title: titleCallback }) {
        payload.value = initialPayload;
        key.value = void 0;

        // Set
        component.value = initialComponent ? markRaw(unwrapModule<ResolvedComponent>(initialComponent)) : void 0;
        if (!component.value) {
            Promise
                .resolve(resolveComponent(initialPayload.page.component))
                .then(mod => { component.value = markRaw(unwrapModule<ResolvedComponent>(mod)) })
                .catch(console.error);
        }
        runtime.title = titleCallback ?? runtime.title;
        runtime.resolver = resolveComponent;

        // Popstate
        window.addEventListener("popstate", () => window.location.reload());

        // Return
        return () => {
            if (!component.value || !payload.value) {
                return null;
            }

            const props = payload.value.page.props ?? {};
            const child = h(component.value, { ...(props as any), key: key.value });

            // Handle Component Layout
            if (layout.value) {
                component.value.layout = layout.value;
                layout.value = null;
            }

            // Get User Component
            let userComponent: VNode;

            const childLayout = component.value.layout;
            if (!childLayout) {
                userComponent = child;
            } else if (typeof childLayout === "function") {
                userComponent = childLayout(h, child);
            } else {
                const layouts = (Array.isArray(childLayout) ? childLayout : [childLayout]) as any[];
                userComponent = layouts
                    .slice()
                    .reverse()
                    .reduce<VNode>((acc, L) => h(L, { ...(props as any) }, () => acc), child as any);
            }

            // Render
            return h(Fragment, null, [
                h(ProgressBar),
                userComponent,
            ]);
        };
    },
});

/**
 * Handle Components
 * @returns 
 */
export function createComponentsFacade(): ComponentsFacade {
    const { components } = usePayload();

    return new Proxy({} as ComponentsFacade, {
        get(_t, prop) {
            if (prop === "has") {
                return (alias: string) => !!components.value && alias in components.value;
            }
            if (prop === "get") {
                return (alias: string): OctoberComponentHandle | null => {
                if (!components.value || !(alias in components.value)) return null;
                    return useComponent(alias);
                };
            }

        if (typeof prop !== "string") {
            return undefined;
        }
        if (!components.value || !(prop in components.value)) return null;
            return useComponent(prop);
        },
    });
}

/**
 * Laika Vue Plugin
 */
export const plugin: LaikaVuePlugin = {
    /**
     * Install Laika Plugin
     * @param app 
     */
    install(app) {
        const self = this;
        const getRuntime = () => runtime;
        
        // Composable
        const componentsFacade = createComponentsFacade();
        const progress = getProgressBar();

        // install router plugin
        router = createRouter(getRuntime, {
            onBefore:  (request) => { 
                progress.start();
                self.onRouterBefore(request);
            },
            onSuccess: (request, response) => { 
                progress.done();
                self.onRouterSuccess(request, response);
            },
            onFailure: (request, response) => { 
                progress.fail();
                self.onRouterFailure(request, response);
            }
        });
        provideRouter(router, app);

        // install october plugin
        october = createOctober(getRuntime, router as LaikaRouter);
        provideOctober(october, app);

        // Attach global properties
        Object.defineProperty(app.config.globalProperties, '$laika', {
            get: () => runtime
        });
        Object.defineProperty(app.config.globalProperties, '$payload', {
            get: () => runtime.payload
        });
        Object.defineProperty(app.config.globalProperties, '$components', {
            get: () => componentsFacade
        });
        Object.defineProperty(app.config.globalProperties, '$router', {
            get: () => router
        });
        Object.defineProperty(app.config.globalProperties, '$october', {
            get: () => october
        });
    },

    /**
     * 
     * @param request 
     */
    async onRouterBefore(request) {
        // may add custom user hooks?
    },

    /**
     * 
     * @param request 
     * @param response 
     */
    async onRouterSuccess(request, response) {
        // may add custom user hooks?

        if (response.status === 409) {
            const loc = response.headers.get("X-Laika-Location");
            if (loc) {
                window.location.assign(loc);
            }
            throw new Error("Laika redirect");
        }

        if (!response.ok) {
            window.location.assign(request.url);
            throw new Error("Navigation fallback");
        }

        const only = parseOnlyHeader(response.headers.get("X-Laika-Only"));
        const data = (await response.json()) as LaikaPayload;
        this.swap(data, false, only);
    },

    /**
     * 
     * @param request 
     * @param response 
     */
    async onRouterFailure(request, response) {
        // may add custom user hooks?
    },

    /**
     * Swap current Payload
     * @param nextPayload 
     * @param preserveState 
     * @param only 
     */
    async swap(nextPayload: LaikaPayload, preserveState?: boolean, only?: string[]) {
        if ('page' in nextPayload && 'component' in nextPayload.page) {
            const mod = await runtime.resolver(nextPayload.page.component);
            component.value = markRaw(unwrapModule<ResolvedComponent>(mod));
        }

        if (only && only.length && payload.value) {
            payload.value = this.patch(payload.value, nextPayload, only);
        } else {
            payload.value = nextPayload;
        }

        if ('page' in nextPayload && 'title' in nextPayload.page) {
            const title = payload.value?.page?.title;
            if (title) {
                document.title = (runtime.title ?? ((x) => x))(title) || 'Laika Unknown Title';
            }
        }

        key.value = preserveState ? key.value : Date.now();
    },
    
    /**
     * Patch current Payload
     * @param current 
     * @param next 
     * @param only 
     * @returns 
     */
    patch(current: LaikaPayload, next: LaikaPayload, only: string[]): LaikaPayload {
        let out: any = { ...(current as any) };

        for (const path of only) {
            if (!path) {
                continue;
            }

            // If the server returned a top-level replacement, accept it
            if (!path.includes('.')) {
                if (path in (next as any)) {
                    out[path] = (next as any)[path];
                }
                continue;
            }

            // Dot-path patch: set only what was requested, if it exists in next
            const val = getByPath(next as any, path);
            console.log(JSON.stringify(current));
            console.log(JSON.stringify(next));
            if (val !== undefined) {
                out = setByPath(out as any, path, val);
            }
            console.log(JSON.stringify(out));
        }

        return out as LaikaPayload;
    }
};

/**
 * Provide Composable Support
 * @returns 
 */
export function useLaika<PageProps extends Props = Props, SharedProps extends Props = Props, ThemeOptions extends Props = Props>(): LaikaRuntime<PageProps, SharedProps, ThemeOptions> {
    return runtime;
}

/**
 * Provide Composable Support
 * @returns 
 */
export function usePayload<PageProps extends Props = Props, SharedProps extends Props = Props, ThemeOptions extends Props = Props>(): LaikaPayloadRefs<PageProps, SharedProps, ThemeOptions> {
    return {
        version: computed(() => payload.value?.version),
        token: computed(() => payload.value?.token),
        theme: computed(() => payload.value?.theme),
        page: computed(() => payload.value?.page),
        components: computed(() => payload.value?.components),
        october: computed(() => payload.value?.october),
        shared: computed(() => payload.value?.shared),
    } as LaikaPayloadRefs<PageProps, SharedProps, ThemeOptions>;
}
