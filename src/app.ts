import type {
    LaikaAppComponent,
    LaikaComposable,
    LaikaPayload,
    LaikaRouter,
    LaikaRuntime,
    LaikaVuePlugin,
    OctoberAPI,
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
import { createOctober, provideOctober } from "./composables/use-october";
import { getProgressBar } from "./singletons/get-progress-bar";
import { getByPath, parseOnlyHeader, setByPath, unwrapModule } from "./utils";
import { createRouter, provideRouter } from "./composables/use-router";

// States
const component = shallowRef<DefineComponent>();
const payload = shallowRef<LaikaPayload>();
const layout = shallowRef<any>(null);
const key = ref<number | undefined>(undefined);
const runtime: LaikaRuntime = {
    payload: () => void 0,
    page: () => void 0,
    title: (title: string) => title,
    resolver: () => void 0,
    getLayout: () => layout.value,
    setLayout: (next: any) => { layout.value = next; }
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

        // Set Component
        component.value = initialComponent ? markRaw(unwrapModule<ResolvedComponent>(initialComponent)) : void 0;
        if (!component.value) {
            Promise
                .resolve(resolveComponent(initialPayload.page.component))
                .then(mod => { component.value = markRaw(unwrapModule<ResolvedComponent>(mod)) })
                .catch(console.error);
        }

        // Initialize Laika Runtime
        runtime.payload = () => payload.value;
        runtime.page = () => payload.value?.page;
        runtime.title = titleCallback ?? runtime.title;
        runtime.resolver = resolveComponent;
        runtime.getLayout = () => layout.value;
        runtime.setLayout = (next: any) => { layout.value = next; };

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
        const progress = getProgressBar();

        // install october functions
        october = createOctober(getRuntime);
        provideOctober(october, app);

        // install router
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

        // Attach global properties
        Object.defineProperty(app.config.globalProperties, '$laika', {
            get: () => runtime
        });
        Object.defineProperty(app.config.globalProperties, '$payload', {
            get: () => payload.value
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
        const mod = await runtime.resolver(nextPayload.page.component);
        component.value = markRaw(unwrapModule<ResolvedComponent>(mod));

        if (only && only.length && payload.value) {
            payload.value = this.patch(payload.value, nextPayload, only);
        } else {
            payload.value = nextPayload;
        }

        const title = payload.value?.page?.title;
        if (title) {
            document.title = (runtime.title ?? ((x) => x))(title) || 'Laika Unknown Title';
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
        const out: any = { ...(current as any) };
        const top = new Set(only.filter(k => !k.startsWith('shared.')));

        for (const key of top) {
            if (key in (next as any)) {
                out[key] = (next as any)[key];
            }
        }

        const sharedPaths = only.filter(k => k.startsWith('shared.'));
        if (sharedPaths.length) {
            out.shared = { ...(out.shared ?? {}) };

            for (const path of sharedPaths) {
                const val = getByPath(next as any, path);
                if (val !== undefined) {
                    setByPath(out as any, path, val);
                }
            }
        }

        return out as LaikaPayload;
    }
};

/**
 * Provide Composable Support
 * @returns 
 */
export function useLaika<PageProps extends Props = Props, SharedProps extends Props = Props>(): LaikaComposable<PageProps, SharedProps> {
    return reactive({
        component: computed(() => component.value),
        layout: computed(() => layout.value),
        key: computed(() => key.value),
        payload: computed(() => payload.value),
        version: computed(() => payload.value?.version),
        page: computed(() => payload.value?.page),
        shared: computed(() => payload.value?.shared),
        theme: computed(() => payload.value?.theme),
        components: computed(() => payload.value?.components),
        runtime: computed(() => runtime),
    }) as LaikaComposable<PageProps, SharedProps>;
}
