import { WorkflowExperience } from "@spiffcommerce/core";

const PREVIEW_RESOLUTION = 1024;

/**
 * Whether the workflow allows customers to download a proof of their design.
 */
export const canDownloadPreview = (workflowExperience: WorkflowExperience) => {
    const workflow = workflowExperience.getWorkflow();
    return !!workflow?.allowProofDownload && workflow.panels.length > 0;
};

/**
 * Renders the current design to an image and downloads it, mirroring Beeline's finish step.
 */
export const downloadPreview = async (workflowExperience: WorkflowExperience) => {
    const workflow = workflowExperience.getWorkflow();
    if (!workflow) return;

    const previewService = workflowExperience.getWorkflowManager().getPreviewService();
    const cameraOrientation = workflow.finalizeStepConfig?.lookAtAnimation;
    const dataUrl =
        workflow.showModelOnFinishStep && previewService && cameraOrientation
            ? await previewService.renderSceneScreenshot(PREVIEW_RESOLUTION, cameraOrientation)
            : await workflowExperience.createPreviewImage(false, PREVIEW_RESOLUTION);

    const panel = workflow.panels[workflow.defaultPreviewPanelIndex || 0] ?? workflow.panels[0];
    const link = document.createElement("a");
    link.download = `${(panel?.name ?? workflow.name).replace(/ /g, "")}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
