import type { LaikaRuntime, LaikaPayload } from "./laika";
import type { OctoberAPI } from "./october";

declare module 'vue' {
    interface ComponentCustomProperties {
        $laika: LaikaRuntime;
        $payload: LaikaPayload | undefined;
        $october: OctoberAPI;
    }
}

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $laika: LaikaRuntime;
        $payload: LaikaPayload | undefined;
        $october: OctoberAPI;
    }
}

// Module
export {};
