import type { App, Component, DefineComponent, ObjectPlugin, Plugin } from 'vue';
import type { Props, ResolveCallback, ResolveResult, ResolveTitle } from './base';
import type { OctoberComponents, OctoberPayload } from './october';

export interface ThemeObject<ThemeOptions extends Props = Props> {
    name: string | null;
    description: string | null;
    homepage: string | null;
    author: string | null;
    authorCode: string | null;
    code: string | null;
    options: ThemeOptions;
}

export interface PageMetaObject extends Props {
    title: string | null;
    meta_title: string | null;
    meta_description: string | null;
}

export interface PageObject<PageProps extends Props = Props> {
    id: string | null;
    url: string | null;
    file: string | null;
    component: string;
    props: PageProps;
    layout: string;
    theme: string | number;
    title: string;
    meta: PageMetaObject;
    content: string | null;
}

export interface LaikaPayload<PageProps extends Props = Props, SharedProps extends Props = Props, ThemeOptions extends Props = Props> {
    version: string | null;
    token: string | null;
    theme: ThemeObject<ThemeOptions>;
    page: PageObject<PageProps>;
    components: OctoberComponents;
    october: OctoberPayload;
    shared: SharedProps;
}

export interface LaikaAppComponentProps<PageProps extends Props = Props, SharedProps extends Props = Props, ThemeOptions extends Props = Props> {
    initialPayload: LaikaPayload<PageProps, SharedProps, ThemeOptions>;
    initialComponent?: DefineComponent;
    resolveComponent: ResolveCallback;
    title?: ResolveTitle;
}

export type LaikaAppComponent<PageProps extends Props = Props, SharedProps extends Props = Props, ThemeOptions extends Props = Props>
    = DefineComponent<LaikaAppComponentProps<PageProps, SharedProps, ThemeOptions>>;

export type LaikaPlugin = Plugin;

export interface LaikaRuntime<PageProps extends Props = Props, SharedProps extends Props = Props, ThemeOptions extends Props = Props> {
    payload: () => LaikaPayload<PageProps, SharedProps, ThemeOptions> | undefined;
    page: () => LaikaPayload<PageProps, SharedProps, ThemeOptions>['page'] | undefined;
    title: ResolveTitle | (() => undefined);
    resolver: ResolveCallback | (() => undefined);
    getLayout?: () => string | undefined;
    setLayout?: (layout: any) => void;
}

export interface LaikaSetup<PageProps extends Props = Props, SharedProps extends Props = Props, ThemeOptions extends Props = Props> {
    root: HTMLElement;
    App: LaikaAppComponent<PageProps, SharedProps, ThemeOptions> | Component; 
    props: LaikaAppComponentProps<PageProps, SharedProps, ThemeOptions>;
    payload: LaikaPayload<PageProps, SharedProps, ThemeOptions>;
    plugin: LaikaPlugin;
}

export interface LaikaOptions<PageProps extends Props = Props, SharedProps extends Props = Props, ThemeOptions extends Props = Props> {
    title?: (title: string) => string;
    resolve: (name: string) => ResolveResult;
    setup: (options: LaikaSetup<PageProps, SharedProps, ThemeOptions>) => App;
    rootId?: string;
    onError?: (err: unknown) => void;
}

export interface LaikaComposable<PageProps extends Props = Props, SharedProps extends Props = Props, ThemeOptions extends Props = Props> {
    component: DefineComponent | undefined;
    layout: any;
    key: number | undefined;
    payload: LaikaPayload<PageProps, SharedProps, ThemeOptions> | undefined;
    version: string | null | undefined;
    page: PageObject<PageProps> | undefined;
    shared: SharedProps | undefined;
    theme: ThemeObject<ThemeOptions>;
    components: OctoberComponents | undefined;
    runtime: LaikaRuntime<PageProps, SharedProps, ThemeOptions>;
}

export interface LaikaVuePlugin extends ObjectPlugin {
    onRouterBefore(request: Request): void;
    onRouterSuccess(request: Request, response: Response): void;
    onRouterFailure(request: Request, response?: Response): void;
    swap(nextPayload: LaikaPayload, preserveState?: boolean, only?: string[]): void;
    patch(current: LaikaPayload, next: LaikaPayload, only: string[]): LaikaPayload;
}
