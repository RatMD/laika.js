import { defineComponent, h, type DefineComponent } from "vue";
import { usePayload } from "../app";

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
        const payload = usePayload();
        return () => {
            const innerHTML = payload.page.value.content ?? "";
            return h('div', { innerHTML });
        };
    }
});
