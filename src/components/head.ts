import { useLaika } from "../app";
import {
    type DefineComponent,
    type SlotsType,
    type VNodeChild,
    defineComponent,
    h,
    Teleport,
    ref,
    watch,
} from "vue";

export interface HeadProps {
    /**
     * Usable to force a soft head-reset, instead of using :key.
     */
    watchKey?: string | number;
}

export interface HeadSlots {
    /**
     * The desired content to teleport between <head>.
     * @returns 
     */
    default?: () => VNodeChild;
}

export const Head: DefineComponent<
    HeadProps,
    {}, {}, {}, {}, {}, {}, {}, string, any, any,
    HeadSlots
> = defineComponent({
    /**
     * Internal Name
     */
    name: "LaikaHead",
    
    /**
     * Component Properties
     */
    props: {
        watchKey: {
            type: [String, Number],
            required: false
        },
    },

    /**
     * Component Slots
     */
    slots: Object as SlotsType<{
        default: () => VNodeChild,
    }>,

    /**
     *
     * @param props
     * @param param
     * @returns
     */
    setup(props, { slots }) {
        const laika = useLaika();
        const revision = ref<number>(0);
        const getUniqueKey = () => {
            return props.watchKey ?? laika?.page?.id ?? laika?.page?.url ?? null;
        };
        
        // Watch key to observer changes
        watch(() => getUniqueKey(), () => {
            revision.value++;
        });

        // Render
        return () => {
            const children = slots.default?.();
            if (!children) {
                return null;
            } else {
                return h(
                    Teleport,
                    { to: "head", key: `${String(getUniqueKey())}:${revision.value}` },
                    children as any
                );
            }
        };
    }
});
