import { defineComponent, h, ref, watch, type PropType } from "vue";
import { useOctober } from "../plugins/use-october";

export const ServerPartial = defineComponent({
    /**
     * Internal Name
     */
    name: "LaikaServerPartial",

    /**
     * Component Properties
     */
    props: {
        name: {
            type: String,
            required: true,
        },
        parameters: {
            type: Object as PropType<Record<string, unknown>>,
            default: () => ({}),
        },
        tag: {
            type: String,
            default: "div",
        },
    },

    /**
     * Component Setup
     * @param props 
     * @returns 
     */
    setup(props) {
        const october = useOctober();
        const html = ref("");
        const pending = ref(false);
        const error = ref<Error | null>(null);
        let revision = 0;

        watch(
            () => [props.name, props.parameters] as const,
            async () => {
                const currentRevision = ++revision;
                pending.value = true;
                error.value = null;
                try {
                    const result = await october.renderPartial(props.name, props.parameters);
                    if (currentRevision === revision) {
                        html.value = result;
                    }
                } catch (reason) {
                    if (currentRevision === revision) {
                        error.value = reason instanceof Error ? reason : new Error(String(reason));
                    }
                } finally {
                    if (currentRevision === revision) {
                        pending.value = false;
                    }
                }
            },
            { immediate: true, deep: true },
        );

        return () => h(props.tag, {
            innerHTML: html.value,
            "data-laika-partial": props.name,
            "data-loading": pending.value ? "true" : undefined,
            "data-error": error.value?.message,
        });
    },
});
