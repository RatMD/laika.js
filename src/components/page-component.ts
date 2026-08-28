import type { OctoberComponent } from "../types";
import { usePayload } from "../app";
import { useComponent } from "../plugins/use-component";
import { defineComponent, h, PropType, ref, SlotsType, VNodeChild, watch, type DefineComponent } from "vue";

export interface PageComponentProps {
    /**
     * The registered component name or alias.
     */
    name: string;
}

export interface PageComponentSlots {
    /**
     * 
     * @param props 
     */
    default(props: OctoberComponent): VNodeChild;
}

export const PageComponent: DefineComponent<
    PageComponentProps,
    {}, {}, {}, {}, {}, {}, {}, string, any, any,
    PageComponentSlots
> = defineComponent({
    /**
     * Internal Name
     */
    name: "LaikaPageComponent",

    /**
     * Component Properties
     */
    props: {
        name: {
            type: String as PropType<string>,
            required: true
        },
    },

    /**
     * Component Slots
     */
    slots: Object as SlotsType<{
        default: (props: OctoberComponent) => VNodeChild,
    }>,

    /**
     *
     * @param props
     * @returns
     */
    setup(props, { slots }) {
        const payload = usePayload();
        const component = useComponent(props.name);
        const loadingHtml = ref(false);

        watch(
            () => payload.components.value?.[props.name],
            async (componentData) => {
                if (!componentData || componentData.html !== undefined || loadingHtml.value) {
                    return;
                }

                loadingHtml.value = true;
                try {
                    await component.loadHtml();
                } finally {
                    loadingHtml.value = false;
                }
            },
            { immediate: true },
        );

        // Render
        return () => {
            if (!(payload.components.value && props.name in payload.components.value)) {
                return null;
            }

            const componentData = payload.components.value[props.name] as OctoberComponent || undefined;
            if (!componentData) {
                return null;
            }

            const children = slots.default?.(component);
            if (children) {
                return h('div', { }, children);
            }

            return componentData.html ? h('div', { innerHTML: componentData.html }) : null;
        };
    }
});
