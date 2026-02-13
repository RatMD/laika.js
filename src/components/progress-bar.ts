import { defineComponent, h, type DefineComponent } from "vue";
import { useProgressBar } from "../progress";

/**
 * Render ProgressBar
 */
export const ProgressBar: DefineComponent = defineComponent({
    /**
     *
     * @param props
     * @returns
     */
    setup(props) {
        const progress = useProgressBar();
        return () => {
            if (!progress.state.active) {
                return;
            } else {
                return h("div", {
                    class: "laika-progress-bar",
                    style: {
                        top: 0,
                        left: 0,
                        width: `${progress.state.percent}%`,
                        height: '0.2rem',
                        position: 'fixed',
                        backgroundColor: `var(--laika-progress-bar, ${progress.state.color})`,
                        transition: 'width 120ms linear',
                        zIndex: 99999
                    },
                });
            }
        };
    }
});
