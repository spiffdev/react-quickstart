import { WorkflowExperience } from "@spiffcommerce/core";
import { getPreviewService } from "./components/ThreeDPreview";

/**
 * Whether the workflow wants its preview image taken from the 3D scene, rather than from its 2D layouts.
 */
const wants3DPreview = (workflowExperience: WorkflowExperience) => {
    const workflow = workflowExperience.getWorkflow();
    return !!workflow?.showModelOnFinishStep && !!workflow.finalizeStepConfig?.lookAtAnimation;
};

const LIGHTING_TIMEOUT_MS = 5000;

/**
 * The preview is only initialised once, so awaiting that doesn't cover an environment that was changed since (as the
 * workflow's preview configuration does). Nothing renders on screen to wait for it here, so wait for the scene and
 * its environment to be ready, otherwise the image is lit without the environment and comes out dark.
 */
const waitForLighting = async (service: ReturnType<typeof getPreviewService>) => {
    const { scene } = service.getEngineContext();
    const deadline = Date.now() + LIGHTING_TIMEOUT_MS;
    while (scene.environmentTexture && !scene.environmentTexture.isReady() && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await scene.whenReadyAsync();
};

/**
 * Runs `action` with the experience's model loaded into the preview service, so a 3D screenshot can be taken from
 * pages that don't show the preview.
 *
 * Nothing that is already loaded is disturbed: if the experience is on screen it's used as it is, and if another
 * experience is on screen the model isn't loaded at all (so the action sees no preview service, and a 2D image is
 * used). Only when the preview is free is the model loaded, which is awaited, and it's ejected again afterwards.
 */
export const withScreenshotPreview = async <T>(
    workflowExperience: WorkflowExperience,
    action: () => Promise<T>,
): Promise<T> => {
    const manager = workflowExperience.getWorkflowManager();
    const bundle = workflowExperience.getBundle();
    const previewBusy = (bundle?.getWorkflowExperiences() ?? []).some((experience) =>
        experience.getWorkflowManager().getPreviewService(),
    );
    if (!wants3DPreview(workflowExperience) || previewBusy) return action();

    const service = getPreviewService();
    try {
        service.updatePreviewOptions({ ...workflowExperience.getWorkflow()?.globalPreviewConfig });
        await manager.injectIntoPreviewService(service);
        await Promise.all([
            service.getInitializationPromise(),
            manager.getModelContainer()?.getInitializationPromise(),
        ]);
        await waitForLighting(service);
    } catch (error) {
        // Without the model the action can only produce a 2D image.
        console.error("Error loading the 3D preview for a screenshot:", error);
        manager.ejectFromPreviewService();
        return action();
    }
    try {
        return await action();
    } finally {
        manager.ejectFromPreviewService();
    }
};

/**
 * Creates the design's preview image, from the 3D scene when the workflow is set up for it and otherwise (or when that
 * fails) from its 2D layouts. Use inside `withScreenshotPreview` when the preview may not be on screen.
 */
export const createDesignPreviewImage = async (
    workflowExperience: WorkflowExperience,
    resolution: number,
    use3D = wants3DPreview(workflowExperience),
): Promise<string> => {
    if (use3D && workflowExperience.getWorkflowManager().getPreviewService()) {
        try {
            const image = await workflowExperience.createPreviewImage(true, resolution);
            if (image) return image;
        } catch (error) {
            console.error("Error creating the 3D preview image:", error);
        }
    }
    return workflowExperience.createPreviewImage(false, resolution);
};
