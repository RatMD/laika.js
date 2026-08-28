import type { LaikaPayload } from "./types";
import { shallowRef } from "vue";

/** 
 * Shared reactive payload state used by the runtime and composables. 
 */
export const payload = shallowRef<LaikaPayload>();
