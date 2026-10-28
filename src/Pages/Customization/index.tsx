import { FunctionComponent, useEffect, useState } from "react";
import { AnyStepData, Step, StepType, WorkflowExperience, WorkflowScene } from "@spiffcommerce/core";
import Card from "../../components/card";
import Typography from "../../components/typography";
import LoadingOverlay from "../components/LoadingOverlay";
import {
    InformationUI,
    ModuleUI,
    QuestionUI,
    MaterialUI,
    ModelUI,
    PictureUI,
    IllustrationUI,
    ShapeUI,
    TextUI,
    DigitalContentUI,
    FrameUI,
    FinishUI,
} from "./Steps";

const StepHandler: FunctionComponent<{ step: Step<AnyStepData> }> = ({ step }) => {
    const renderStepComponent = () => {
        switch (step.type) {
            case StepType.Information:
                return <InformationUI step={step} />;
            case StepType.Module:
                return <ModuleUI step={step} />;
            case StepType.Question:
                return <QuestionUI step={step} />;
            case StepType.Material:
                return <MaterialUI step={step} />;
            case StepType.Model:
                return <ModelUI step={step} />;
            case StepType.Picture:
                return <PictureUI step={step} />;
            case StepType.Illustration:
                return <IllustrationUI step={step} />;
            case StepType.Shape:
                return <ShapeUI step={step} />;
            case StepType.Text:
                return <TextUI step={step} />;
            case StepType.DigitalContent:
                return <DigitalContentUI step={step} />;
            case StepType.Frame:
            case StepType.Photo: // Photo is deprecated, use Frame
                return <FrameUI step={step} />;
            case StepType.Finish:
                return <FinishUI step={step} />;
            default:
                return (
                    <div>
                        <Typography>Unsupported step type: {step.type}</Typography>
                    </div>
                );
        }
    };

    return (
        <div>
            <Typography variant="h3">{step.stepTitle}</Typography>
            {renderStepComponent()}
        </div>
    );
};

const Customization: FunctionComponent<{
    workflowExperience: WorkflowExperience;
    onNext: () => void;
}> = ({ workflowExperience }) => {
    const [traversableScenes, setTraversableScenes] = useState<WorkflowScene[]>([]);

    useEffect(() => {
        workflowExperience.getWorkflowManager().addSelectionCallback((callbackOptions) => {
            setTraversableScenes(callbackOptions.traversableScenes);
        });
    }, [workflowExperience]);

    if (traversableScenes.length === 0) {
        // TODO: spinner
        return <LoadingOverlay />;
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
