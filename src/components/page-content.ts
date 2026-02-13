import { defineComponent, h, type DefineComponent } from "vue";
import { useLaika } from "../app";

export const PageContent: DefineComponent = defineComponent({
    /**
     * Internal Name
     */
    name: "LaikaPageContent",

    /**
     *
     * @param props
     * @returns
     */
    setup(props) {
        const laika = useLaika();
        return () => {
            const innerHTML = laika.page?.content ?? "";
            return h('div', { innerHTML });
        };
    }
});
