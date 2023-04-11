/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/latest/tutorial/process-model
 *
 */
import "./index.css";
import * as React from "react";
import { useState } from "react";
import { SpiffCommerceClient, WorkflowExperience } from "@spiffcommerce/core";
import { SpiffCommerce3DPreviewService } from "@spiffcommerce/preview";

console.log(
  '👋 This message is being logged by "App.tsx"'
);

/**
 * This is the main wrapper component for the App editor.
 * See app in src/index.tsx for usage.
 */
const App: React.FunctionComponent<{
  /**
   * The workflow to be used.
   */
  workflowId: string;
  /**
   * The integration product associated to the workflow being run.
   */
  integrationProductId: string;
}> = ({ workflowId, integrationProductId }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [workflowExperience, setWorkflowExperience] = useState<
    WorkflowExperience | undefined
  >(undefined);

  // This effect handles initialize of the workflow experience when the user first arrives at the page. Loading
  // saved designs will be handled within App seperately.
  React.useEffect(() => {
    if (!canvasRef.current) return;
    const init = async () => {
      const client = new SpiffCommerceClient({});
      await client.initFromIntegrationProduct(integrationProductId);
      const experience = await client.getWorkflowExperience(
        workflowId,
        undefined,
        (workflow) => {
          const canvas = document.createElement("canvas");
          return new SpiffCommerce3DPreviewService(
            canvas,
            workflow.globalPreviewConfig
          );
        }
      );
      experience
        .getWorkflowManager()
        .getPreviewService()
        .registerView(canvasRef.current);
      setWorkflowExperience(experience);
    };
    init().then(() => console.log("Workflow Experience Initialized"));
    // We only want this to run when the parameters passed in change. The workflow experience
    // changing internally due to saved designs etc.. Should not trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, integrationProductId, workflowId]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <canvas
        id="3D-preview-canvas"
        ref={canvasRef}
        style={{ width: "100%", height: "100%", outline: "none" }}
        width="100%"
        height="100%"
      />
    </div>
  );
};

export default App;