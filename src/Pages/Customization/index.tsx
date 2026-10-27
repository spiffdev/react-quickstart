import { FunctionComponent, useEffect, useState } from "react";
import { AnyStepData, Step, WorkflowExperience, WorkflowScene } from "@spiffcommerce/core";
import Card from "../../components/card";
import Typography from "../../components/typography";

const StepHandler: FunctionComponent<{ step: Step<AnyStepData> }> = ({ step }) => {
    return (
        <div>
            <Typography>{step.stepTitle}</Typography>
            {/* TODO: switch type and display correct component (from ./components) */}
        </div>
    );
};

const Customization: FunctionComponent<{
    workflowExperience: WorkflowExperience;
    onNext: () => void;
}> = ({ workflowExperience }) => {
    const [selectionCost, setSelectionCost] = useState(0);
    const [traversableScenes, setTraversableScenes] = useState<WorkflowScene[]>([]);

    useEffect(() => {
        workflowExperience.getWorkflowManager().addSelectionCallback((callbackOptions) => {
            setSelectionCost(callbackOptions.selectionCost || 0);
            setTraversableScenes(callbackOptions.traversableScenes);
        });
    }, [workflowExperience]);

    if (traversableScenes.length === 0) {
        // TODO: spinner
        return <div>Loading...</div>;
    }

    return (
        <div>
            {/* TODO: 3D preview */}
            {traversableScenes.map((scene) => (
                <Card key={scene.name}>
                    <Typography variant="h2">{scene.title}</Typography>
                    {scene.renderableSteps.map((step) => (
                        <StepHandler key={step.stepName} step={step} />
                    ))}
                </Card>
            ))}
        </div>
    );
};

export default Customization;
