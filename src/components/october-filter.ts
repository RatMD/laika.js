import { defineComponent, h, type PropType } from "vue";
import { useOctoberFilter, type OctoberFilterName } from "../plugins/use-october-filter";

export const OctoberFilter = defineComponent({
    /**
     * Internal Name
     */
    name: "LaikaOctoberFilter",

    /**
     * Component Properties
     */
    props: {
        name: {
            type: String as PropType<OctoberFilterName>,
            required: true,
        },
        value: {
            type: String,
            default: "",
        },
        tag: {
            type: String,
            default: "div",
        },
    },

    /**
     * 
     * @param props 
     * @param params
     * @returns 
     */
    setup(props, { slots }) {
        const state = useOctoberFilter(() => props.name, () => props.value);

        return () => {
            if (slots.default) {
                return slots.default({
                    value: state.value.value,
                    pending: state.pending.value,
                    error: state.error.value,
                    refresh: state.refresh,
                });
            }

            return h(props.tag, {
                innerHTML: state.value.value,
                "data-loading": state.pending.value ? "true" : undefined,
                "data-error": state.error.value?.message,
            });
        };
    },
});
