import type { FlashTypes } from "../types";
import { usePayload } from "../app";
import { defineComponent, h, PropType, SlotsType, VNodeChild, type DefineComponent } from "vue";

export interface FlashProps {
    /**
     * Restrict to this specific flash type.
     */
    type?: FlashTypes;
}

export interface FlashSlots {
    /**
     * 
     * @param props 
     */
    default(props: { type: FlashTypes, message: string | string[] }): VNodeChild;
}

export const Flash: DefineComponent<
    FlashProps,
    {}, {}, {}, {}, {}, {}, {}, string, any, any,
    FlashSlots
> = defineComponent({
    /**
     * Internal Name
     */
    name: "LaikaFlash",
    
    /**
     * Component Properties
     */
    props: {
        type: {
            type: String as PropType<string>,
            required: false
        },
    },
    
    /**
     * Component Slots
     */
    slots: Object as SlotsType<{
        default: (props: { type: FlashTypes, message: string | string[] }) => VNodeChild,
    }>,

    /**
     *
     * @param props
     * @param param
     * @returns
     */
    setup(props, { slots }) {
        const payload = usePayload();
        
        // Render
        return () => {
            const flash = payload.page.value.flash;
            if (props.type != null && !(props.type in flash)) {
                return null;
            }
            if (!slots.default) {
                return null;
            }

            const children: VNodeChild[] = [];
            for (const [type, message] of Object.entries(flash)) {
                if (props.type != null && props.type !== type) {
                    continue;
                }
                children.push(slots.default({ type: type as FlashTypes, message }));
            }

            return children.length > 0 ? h('div', { }, children) : null;
        };
    }
});
