import type { Props } from "./base";

export interface CurrencyOptions {
    from?: string;
    to?: string;
    format?: string;
    site?: boolean;
}

export interface OctoberComponent {
    component: string;
    alias: string;
    class: string;
    options: Props;
    props: Props;
}

export interface OctoberComponents {
    [alias: string]: OctoberComponent;
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
}

export interface OctoberAPI {
    app(path: string): string;
    theme(path: string | string[]): string | string[];
    page(name?: string | null, params?: Record<string, any> | boolean, persistence?: boolean): string | null;
    media(file: string): string;
    resize(input: string, width?: number | null, height?: number | null, options?: Record<string, any>): string;
    currency(value: string | number, options?: CurrencyOptions): string;
    trans(key: string, replacements?: Record<string, unknown>): string;
    trans_choice(key: string, number: number, replacements?: Record<string, unknown>): string;
    _: OctoberAPI["trans"];
    __: OctoberAPI["trans_choice"];

    content(markup: string): Promise<string>;
    md(markdown: string): Promise<string>;
    md_safe(markdown: string): Promise<string>;
    md_clean(markdown: string): Promise<string>;
    md_indent(markdown: string): Promise<string>;
    placeholder(key: string, fallback?: string): Promise<string | null>;
}
