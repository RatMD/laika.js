
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
    raw(url: string, options?: LaikaVisitOptions): Promise<Response>;
    visit(url: string, options?: LaikaVisitOptions): Promise<void>;
    get(url: string, options?: Omit<LaikaVisitOptions, "method">): Promise<void>;
    post(url: string, data?: Record<string, any>, options?: Omit<LaikaVisitOptions, "method" | "data">): Promise<void>;
    put(url: string, data?: Record<string, any>, options?: Omit<LaikaVisitOptions, "method" | "data">): Promise<void>;
    patch(url: string, data?: Record<string, any>, options?: Omit<LaikaVisitOptions, "method" | "data">): Promise<void>;
    delete(url: string, data?: Record<string, any>, options?: Omit<LaikaVisitOptions, "method" | "data">): Promise<void>;
};

export interface LaikaRouterHooks {
    onBefore(request: Request): void;
    onSuccess(request: Request, response: Response): void;
    onFailure(error: unknown, request: Request, response?: Response): void;
}
