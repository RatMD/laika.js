
export interface CurrencyOptions {
    from?: string;
    to?: string;
    format?: string;
    site?: boolean;
}

export interface OctoberAPI {
    app(path: string): string;
    page(path: string): string;
    link(path: string): string;
    theme(path: string): string;
    trans(key: string, replacements?: Record<string, unknown>): string;
    trans_choice(key: string, number: number, replacements?: Record<string, unknown>): string;
    __(key: string, replacements?: Record<string, unknown>): string;
    media(path: string): string;
    md(content: string): string;
    currency(value: string | number, options: CurrencyOptions): any;
    placeholder(key: string): string;
}
