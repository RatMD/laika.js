import {
    type PropType,
    type SlotsType,
    type VNodeChild,
    defineComponent,
    computed,
    h,
} from "vue";
import { useOctober } from "../plugins/use-october";
import { useRouter } from "../plugins/use-router";

export type LinkTarget = "_self" | "_blank" | "_parent" | "_top" | (string & {});

export interface LinkProps {
    /**
     * The OctoberCMS page name (preferred way).
     */
    page?: string;

    /**
     * The relative path or absolute URL.
     */
    link?: string;

    /**
     * The desired link target.
     */
    target?: LinkTarget;
}

export interface LinkSlots {
    default?: () => VNodeChild;
}

/**
 * Normalize relative path
 * @param path 
 * @returns 
 */
function normalizeRelative(path: string): string {
    return path.replace(/^\/+/, "");
}

export const Link = defineComponent({
    /**
     * Internal Name
     */
    name: "LaikaLink",

    /**
     * Don't inherit non-declared attributes
     */
    inheritAttrs: false,

    /**
     * Component Properties
     */
    props: {
        page: { 
            type: String as PropType<string>, 
            required: false 
        },
        link: { 
            type: String as PropType<string>, 
            required: false 
        },
        target: { 
            type: String as PropType<LinkTarget>, 
            required: false 
        },
    },
        
    /**
     * Component Slots
     */
    slots: Object as SlotsType<{
        default: (props: any, attrs: any) => VNodeChild,
    }>,

    /**
     *
     * @param props
     * @param param
     * @returns
     */
    setup(props, { slots, attrs }) {
        const october = useOctober();
        const router = useRouter();

        // States
        const resolvedUrl = computed(() => {
            if (props.page && props.page.trim().length) {
                return october.page(props.page.trim());
            }

            const raw = (props.link ?? "").trim();
            if (!raw) {
                return "#";
            }

            return raw.startsWith('http') ? raw : october.app(normalizeRelative(raw));
        });
        const isExternal = computed(() => {
            if (props.target === "_blank") {
                return true;
            } else {
                return resolvedUrl.value.indexOf(`//${window.location.hostname}/`) < 0;
            }
        });

        /**
         * Handle Visit
         * @param ev
         * @returns 
         */
        function onVisit(ev: MouseEvent) {
            if (isExternal.value) {
                return;
            }
            if (ev.button !== 0) {
                return;
            }
            if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) {
                return;
            }
            
            router.visit(resolvedUrl.value);
        }

        // Render
        return () => {
            const customProps: Record<string, unknown> = {
                ...attrs,
                href: resolvedUrl.value,
                target: props.target,
            };
            if (!isExternal.value) {
                customProps.onClick = (event: MouseEvent) => {
                    event.preventDefault();
                    onVisit(event);
                };
            }
            
            const children = slots.default ? slots.default(customProps, attrs) : undefined;
            return h("a", customProps, children || void 0);
        };
    },
});
