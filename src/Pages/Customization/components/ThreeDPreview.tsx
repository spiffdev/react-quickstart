import { FunctionComponent, useEffect, useRef, useState } from "react";
import { WorkflowExperience } from "@spiffcommerce/core";
import { SpiffCommerce3DPreviewService } from "@spiffcommerce/preview";
import styled from "styled-components";
import LoadingOverlay from "../../components/LoadingOverlay";

const Wrapper = styled.div`
    position: relative;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    overflow: hidden;
`;

const Canvas = styled.canvas`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    outline: none;
    touch-action: none;
`;

// Debounced so a rapid unmount/remount (e.g. React strict mode) doesn't start two loads.
const LOAD_DEBOUNCE_MS = 300;

const getFallbackEnvironmentFile = () => {
    const url = window.location.href;
    if (url.includes(".aumelbdev.")) {
        return "https://assets.aumelbdev.spiffcommerce.com/public/assets/a07eda39-58ed-4cf8-816d-be58e2e13b45.env";
    }
    if (url.includes(".au.")) {
        return "https://assets.au.spiffcommerce.com/public/assets/8b01455e-f642-4413-9bd8-12ae02e569e3.env";
    }
    return "https://assets.us.spiffcommerce.com/public/assets/1367f29d-ac7d-4ff5-a638-15ea40a6d935.env";
};

let previewService: SpiffCommerce3DPreviewService | undefined;
const getPreviewService = () => {
    previewService ??= new SpiffCommerce3DPreviewService({
        environmentFile: getFallbackEnvironmentFile(),
        transparentBackground: true,
    });
    return previewService;
};

const ThreeDPreview: FunctionComponent<{
    workflowExperience: WorkflowExperience;
}> = ({ workflowExperience }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!canvas) return;

        const service = getPreviewService();
        const manager = workflowExperience.getWorkflowManager();
        let cancelled = false;

        const load = async () => {
            service.updatePreviewOptions({
                ...workflowExperience.getWorkflow()?.globalPreviewConfig,
            });
            await manager.injectIntoPreviewService(service);
            service.registerView(canvas);
            await Promise.all([
                service.getInitializationPromise(),
                manager.getModelContainer()?.getInitializationPromise(),
            ]);
            // Sync the render buffer to the canvas' final box before revealing the scene.
            service.fireResizeEvent();
            if (!cancelled) {
                setReady(true);
            }
        };

        const timer = window.setTimeout(() => {
            load().catch((error) => console.error("Error loading 3D preview:", error));
        }, LOAD_DEBOUNCE_MS);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
            service.unregisterView(canvas);
            manager.ejectFromPreviewService();
        };
    }, [canvas, workflowExperience]);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const observer = new ResizeObserver(() => getPreviewService().fireResizeEvent());
        observer.observe(wrapper);
        return () => observer.disconnect();
    }, []);

    return (
        <Wrapper ref={wrapperRef}>
            {!ready && <LoadingOverlay />}
            <Canvas ref={setCanvas} onContextMenu={(e) => e.preventDefault()} />
        </Wrapper>
    );
};

export default ThreeDPreview;
