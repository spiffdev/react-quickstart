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

const StepHandler: FunctionComponent<{
    step: Step<AnyStepData>;
    workflowExperience: WorkflowExperience;
}> = ({ step, workflowExperience }) => {
    const renderStepComponent = () => {
        switch (step.type) {
            case StepType.Information:
                return <InformationUI step={step} />;
            case StepType.Module:
                return <ModuleUI step={step} workflowExperience={workflowExperience} />;
            case StepType.Question:
                return <QuestionUI step={step} workflowExperience={workflowExperience} />;
            case StepType.Material:
                return <MaterialUI step={step} workflowExperience={workflowExperience} />;
            case StepType.Model:
                return <ModelUI step={step} workflowExperience={workflowExperience} />;
            case StepType.Picture:
                return <PictureUI step={step} workflowExperience={workflowExperience} />;
            case StepType.Illustration:
                return <IllustrationUI step={step} workflowExperience={workflowExperience} />;
            case StepType.Shape:
                return <ShapeUI step={step} workflowExperience={workflowExperience} />;
            case StepType.Text:
                return <TextUI step={step} workflowExperience={workflowExperience} />;
            case StepType.DigitalContent:
                return <DigitalContentUI step={step} />;
            case StepType.Frame:
            case StepType.Photo: // Photo is deprecated, use Frame
                return <FrameUI step={step} workflowExperience={workflowExperience} />;
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

    const isFinishStep = step.type === StepType.Finish;

    return (
        <div>
            {!isFinishStep && <Typography variant="h3">{step.stepTitle}</Typography>}
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
        <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "row" }}>
            {/* TODO: 3D preview */}
            <div
                style={{
                    position: "relative",
                    height: "100%",
                    overflow: "auto",
                    flexGrow: "1",
                    gap: "5px",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {traversableScenes.map((scene) => {
                    const isFinishScene = scene.renderableSteps.some((step) => step.type === StepType.Finish);
                    return (
                        <Card key={scene.name}>
                            {!isFinishScene && <Typography variant="h2">{scene.title}</Typography>}
                            {scene.renderableSteps.map((step) => (
                                <StepHandler key={step.stepName} step={step} workflowExperience={workflowExperience} />
                            ))}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default Customization;
