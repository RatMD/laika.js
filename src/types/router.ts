
export type LaikaVisitOptions = {
    method?: "get" | "post" | "put" | "patch" | "delete";
    data?: Record<string, any>;
    replace?: boolean;
    preserveState?: boolean;
    only?: string[];
    force?: boolean;
    require?: string[];
    headers?: Record<string, string>;
};

export type LaikaRouter = {
    visit(url: string, options?: LaikaVisitOptions, returnResponse?: boolean): Promise<Response>;
    get(url: string, options?: Omit<LaikaVisitOptions, "method">, returnResponse?: boolean): Promise<Response>;
    post(url: string, data?: Record<string, any>, options?: Omit<LaikaVisitOptions, "method" | "data">, returnResponse?: boolean): Promise<Response>;
    put(url: string, data?: Record<string, any>, options?: Omit<LaikaVisitOptions, "method" | "data">, returnResponse?: boolean): Promise<Response>;
    patch(url: string, data?: Record<string, any>, options?: Omit<LaikaVisitOptions, "method" | "data">, returnResponse?: boolean): Promise<Response>;
    delete(url: string, data?: Record<string, any>, options?: Omit<LaikaVisitOptions, "method" | "data">, returnResponse?: boolean): Promise<Response>;
};

export interface LaikaRouterHooks {
    onBefore(request: Request): void;
    onSuccess(request: Request, response: Response): void;
    onFailure(error: unknown, request: Request, response?: Response): void;
}
