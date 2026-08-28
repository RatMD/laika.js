import type { OctoberRequestOptions, OctoberRequestResult } from "./types";

type LarajaxRequester = <T = Record<string, unknown>>(
    handler: string,
    options?: OctoberRequestOptions,
) => Promise<OctoberRequestResult<T>>;

type PartialTargets = Record<string, string>;

let requester: LarajaxRequester | null = null;
let listenersInstalled = false;

/**
 * Connect October-style data-request elements to LAIKA's AJAX transport. 
 * @param nextRequester 
 * @returns 
 */
export function installLarajaxBridge(nextRequester: LarajaxRequester): void {
    requester = nextRequester;

    if (listenersInstalled || typeof document === "undefined") {
        return;
    }

    listenersInstalled = true;
    document.addEventListener("submit", handleSubmit);
    document.addEventListener("click", handleClick);
}

/**
 * 
 * @param element 
 * @param name 
 * @param detail 
 * @returns 
 */
function dispatch(element: HTMLElement, name: string, detail: unknown): boolean {
    return element.dispatchEvent(new CustomEvent(name, {
        bubbles: true,
        cancelable: true,
        detail,
    }));
}

/**
 * 
 * @param form 
 * @returns 
 */
function collectFormData(form: HTMLFormElement): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    new FormData(form).forEach((value, rawName) => {
        const isArray = rawName.endsWith("[]");
        const name = isArray ? rawName.slice(0, -2) : rawName;

        if (!(name in data)) {
            data[name] = isArray ? [value] : value;
            return;
        }

        data[name] = Array.isArray(data[name])
            ? [...data[name] as unknown[], value]
            : [data[name], value];
    });

    return data;
}

/**
 * 
 * @param value 
 * @returns 
 */
function parseRequestData(value: string | null): Record<string, unknown> {
    if (!value?.trim()) {
        return {};
    }

    try {
        return JSON.parse(value) as Record<string, unknown>;
    } catch {
        const result: Record<string, unknown> = {};
        const expression = /(?:['"]([^'"]+)['"]|([A-Za-z0-9_.-]+))\s*:\s*(?:['"]([^'"]*)['"]|([^,}\s]+))/g;
        let match: RegExpExecArray | null;

        while ((match = expression.exec(value)) !== null) {
            const key = match[1] ?? match[2];
            const raw = match[3] ?? match[4] ?? "";
            if (!key) {
                continue;
            }
            result[key] = raw === "true" ? true : raw === "false" ? false : raw;
        }

        return result;
    }
}

/**
 * 
 * @param value 
 * @returns 
 */
function parsePartialTargets(value: string | null): PartialTargets {
    if (!value?.trim()) {
        return {};
    }

    const targets: PartialTargets = {};
    const expression = /(?:['"]([^'"]+)['"]|([A-Za-z0-9_./:-]+))\s*:\s*['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;

    while ((match = expression.exec(value)) !== null) {
        const partial = match[1] ?? match[2];
        const selector = match[3];
        if (partial && selector) {
            targets[partial] = selector;
        }
    }

    return targets;
}

/**
 * 
 * @param element 
 * @param loading 
 */
function setLoading(element: HTMLElement, loading: boolean): void {
    element.toggleAttribute("data-request-loading", loading);
    element.setAttribute("aria-busy", loading ? "true" : "false");

    if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
        element.disabled = loading;
    }
}

/**
 * 
 * @param result 
 * @param targets 
 */
function updatePartialTargets(result: OctoberRequestResult, targets: PartialTargets): void {
    for (const [partial, selector] of Object.entries(targets)) {
        const html = result.partials[partial];
        if (html === undefined) {
            continue;
        }

        for (const target of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
            target.innerHTML = html;
        }
    }
}

/**
 * 
 * @param element 
 * @param form 
 * @returns 
 */
async function runRequest(element: HTMLElement, form?: HTMLFormElement): Promise<void> {
    const handler = element.getAttribute("data-request") ?? form?.getAttribute("data-request");
    if (!handler || !requester || element.hasAttribute("data-request-loading")) {
        return;
    }

    const targets = parsePartialTargets(
        element.getAttribute("data-request-update") ?? form?.getAttribute("data-request-update") ?? null,
    );
    const data = {
        ...(form ? collectFormData(form) : {}),
        ...parseRequestData(form?.getAttribute("data-request-data") ?? null),
        ...parseRequestData(element.getAttribute("data-request-data")),
    };

    if (!dispatch(element, "ajax:before", { handler, data })) {
        return;
    }

    setLoading(element, true);

    try {
        const result = await requester(handler, {
            data,
            flash: element.hasAttribute("data-request-flash") || Boolean(form?.hasAttribute("data-request-flash")),
            partials: Object.keys(targets),
            preserveState: true,
        });

        updatePartialTargets(result, targets);
        dispatch(element, result.ok ? "ajax:success" : "ajax:error", result);
    } catch (error) {
        dispatch(element, "ajax:error", { handler, error });
    } finally {
        setLoading(element, false);
        dispatch(element, "ajax:complete", { handler });
    }
}

/**
 * 
 * @param event 
 * @returns 
 */
function handleSubmit(event: SubmitEvent): void {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form?.matches("[data-request]")) {
        return;
    }

    event.preventDefault();
    const submitter = event.submitter instanceof HTMLElement ? event.submitter : form;
    void runRequest(submitter, form);
}

/**
 * 
 * @param event 
 * @returns 
 */
function handleClick(event: MouseEvent): void {
    const origin = event.target instanceof Element ? event.target : null;
    const element = origin?.closest<HTMLElement>("[data-request]");
    if (!element || element instanceof HTMLFormElement) {
        return;
    }

    if ((element instanceof HTMLButtonElement || element instanceof HTMLInputElement)
        && element.form?.matches("[data-request]")) {
        return;
    }

    event.preventDefault();
    void runRequest(element, element.closest("form") ?? undefined);
}
