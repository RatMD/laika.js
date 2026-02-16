import type { Props } from "./base";

export interface CurrencyOptions {
    from?: string;
    to?: string;
    format?: string;
    site?: boolean;
}

export interface OctoberComponent<ComponentProps extends Props = Props, ComponentOptions extends Props = Props> {
    component: string;
    alias: string;
    class: string;
    options: ComponentOptions;
    props: ComponentProps;
    methods: string[];
    vars: string[];
}

export interface OctoberComponents {
    [alias: string]: OctoberComponent<Props, Props>;
}

export type OctoberComponentExtras = {
    get<T = any>(key: string, fallback?: T): T;
    load(keys: string | string[]): Promise<void>;
    loaded(key: string): boolean;
    exists(key: string): boolean;
};

export type OctoberComponentHandle = OctoberComponent<Props, Props> & OctoberComponentExtras;

export type ComponentsFacade = {
    has(alias: string): boolean;
    get(alias: string): OctoberComponentHandle | null;
} & Record<string, OctoberComponentHandle>;

export interface OctoberLocaleSet {
    [locale: string]: Record<string, string>;
}

export interface OctoberPayload {
    baseUrl: string;
    themeBaseUrl: string;
    mediaBaseUrl: string;
    relativeLinks: boolean;
    pages: Record<string, { pattern: string }>;
    currentParams: Record<string, string>;
    resizer: { mode: 'route' | 'controller'; basePath: string; };
    linkTypes?: Record<string, any>;
    fallbackLocale: string;
    strings: OctoberLocaleSet;
}

export interface OctoberAPI {
    app(path: string): string;
    theme<T = string | string[]>(path: T): T;
    page(name?: string | null, params?: Record<string, any> | boolean, persistence?: boolean): string | undefined;
    link(path: string): string;
    media(file: string): string;
    resize(input: string, width?: number | null, height?: number | null, options?: Record<string, any>): string;
    currency(value: string | number, options?: CurrencyOptions): string;
    trans(key: string, replacements?: Record<string, unknown>): string;
    transChoice(key: string, number: number, replacements?: Record<string, unknown>): string;
    placeholder(name: string, defaultValue?: string): any;
    hasPlaceholder(name: string): boolean;

    content(markup: string): Promise<string>;
    md(markdown: string): Promise<string>;
    mdSafe(markdown: string): Promise<string>;
    mdClean(markdown: string): Promise<string>;
    mdIndent(markdown: string): Promise<string>;

    // PHP equivalent naming-conventions
    trans_choice(key: string, number: number, replacements?: Record<string, unknown>): string;
    md_safe(markdown: string): Promise<string>;
    md_clean(markdown: string): Promise<string>;
    md_indent(markdown: string): Promise<string>;
}
