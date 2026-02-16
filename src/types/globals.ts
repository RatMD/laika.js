import type { LaikaRuntime, LaikaPayload } from "./laika";
import type { OctoberAPI, OctoberComponentHandle } from "./october";
import { LaikaRouter } from "./router";

declare module 'vue' {
    interface ComponentCustomProperties {
        $laika: LaikaRuntime;
        $payload: LaikaPayload | undefined;
        $shared: LaikaPayload['shared'] | undefined;
        $components: Record<string, OctoberComponentHandle> | undefined;
        $router: LaikaRouter;
        $october: OctoberAPI;
    }
}

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $laika: LaikaRuntime;
        $payload: LaikaPayload | undefined;
        $shared: LaikaPayload['shared'] | undefined;
        $components: Record<string, OctoberComponentHandle> | undefined;
        $router: LaikaRouter;
        $october: OctoberAPI;
    }
}

// Module
export {};
