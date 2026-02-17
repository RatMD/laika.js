import type { LaikaRuntime, LaikaPayload } from "./laika";
import type { OctoberAPI, OctoberComponentHandle } from "./october";
import { LaikaRouter } from "./router";

declare module 'vue' {
    interface ComponentCustomProperties {
        $laika: LaikaRuntime;
        $router: LaikaRouter;
        $payload: LaikaPayload | undefined;
        $site: LaikaPayload['site'] | undefined;
        $theme: LaikaPayload['theme'] | undefined;
        $page: LaikaPayload['page'] | undefined;
        $components: Record<string, OctoberComponentHandle> | undefined;
        $october: OctoberAPI;
        $shared: LaikaPayload['shared'] | undefined;
    }
}

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $laika: LaikaRuntime;
        $router: LaikaRouter;
        $payload: LaikaPayload | undefined;
        $site: LaikaPayload['site'] | undefined;
        $theme: LaikaPayload['theme'] | undefined;
        $page: LaikaPayload['page'] | undefined;
        $components: Record<string, OctoberComponentHandle> | undefined;
        $october: OctoberAPI;
        $shared: LaikaPayload['shared'] | undefined;
    }
}

// Module
export {};
