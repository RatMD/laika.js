import type { LaikaRuntime, LaikaPayload } from "./laika";
import type { OctoberAPI } from "./october";
import { LaikaRouter } from "./router";

declare module 'vue' {
    interface ComponentCustomProperties {
        $laika: LaikaRuntime;
        $payload: LaikaPayload | undefined;
        $components: LaikaPayload['components'] | undefined;
        $router: LaikaRouter;
        $october: OctoberAPI;
    }
}

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $laika: LaikaRuntime;
        $payload: LaikaPayload | undefined;
        $components: LaikaPayload['components'] | undefined;
        $router: LaikaRouter;
        $october: OctoberAPI;
    }
}

// Module
export {};
