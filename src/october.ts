import type { CurrencyOptions, LaikaRuntime, OctoberAPI } from "./types";

export function createOctoberAPI(getRuntime: () => LaikaRuntime | undefined): OctoberAPI {

    function runtime() {
        const runtime = getRuntime();
        if (!runtime) {
            throw new Error("October API: runtime not ready");
        }
        return runtime;
    }

    function app(path: string) {
        return path;
    }

    function page(path: string) {
        return path;
    }

    function link(path: string) {
        return path;
    }

    function theme(path: string) {
        return path;
    }

    function trans(key: string, replacements?: Record<string, unknown>) {
        return key;
    }

    function trans_choice(key: string, number: number, replacements?: Record<string, unknown>) {
        return key;
    }

    function media(path: string) {
        return path;
    }

    function md(content: string) {
        return content;
    }

    function currency(value: string | number, options: CurrencyOptions = {}) {
        return value;
    }

    function placeholder(key: string) {
        return key;
    }

    // Export Functions
    return {
        app,
        page,
        link,
        theme,
        trans,
        trans_choice,
        __: trans,
        media,
        md,
        currency,
        placeholder
    };
}
