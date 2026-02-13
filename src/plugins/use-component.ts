import { computed } from "vue";
import { usePayload } from "../app";
import { OctoberComponents } from "src/types";

/**
 * Provide Composable Support
 * @returns 
 */
export function useComponent<K extends keyof OctoberComponents>(name: K) {
    const { components } = usePayload();
    return computed(() => components.value?.[name] ?? null);
}