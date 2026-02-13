import type { OctoberComponent } from "../types";
import { useLaika } from "../app";
import { defineComponent, h, PropType, SlotsType, VNodeChild, type DefineComponent } from "vue";

export interface PageComponentProps {
    name: string;
}

export interface PageComponentSlots {
    default(props: OctoberComponent): VNodeChild;
}

/**
 * Render Page Component
 */
export const PageComponent: DefineComponent<
    PageComponentProps,
    {}, {}, {}, {}, {}, {}, {}, string, any, any,
    PageComponentSlots
> = defineComponent({
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
        const laika = useLaika();

        return () => {
            if (!(laika.components && props.name in laika.components)) {
                return null;
            }

            const componentData = laika.components[props.name] as OctoberComponent || undefined;
            if (!componentData) {
                return null;
            }

            const children = slots.default?.({ ...componentData });
            return h('div', { }, children ?? void 0);
        };
    }
});
