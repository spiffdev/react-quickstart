import { FunctionComponent, useEffect, useState } from "react";
import {
    AnyStepData,
    DigitalContentStepHandle,
    FrameStepHandle,
    IllustrationStepHandle,
    InformationStepHandle,
    MaterialStepHandle,
    ModelStepHandle,
    ModuleStepHandle,
    PictureStepHandle,
    QuestionStepHandle,
    ShapeStepHandle,
    Step,
    StepType,
    TextStepHandle,
    WorkflowExperience,
    WorkflowScene,
} from "@spiffcommerce/core";
import Card from "../../components/card";
import Typography from "../../components/typography";
import LoadingOverlay from "../components/LoadingOverlay";
import ThreeDPreview from "./components/ThreeDPreview";
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
    onFinished: () => void | Promise<void>;
}> = ({ step, workflowExperience, onFinished }) => {
    const renderStepComponent = () => {
        // The finish step has no handle.
        if (step.type === StepType.Finish) {
            return (
                <FinishUI
                    termsMarkdown={workflowExperience.getWorkflow()?.finalizeStepConfig?.termsMarkdown}
                    onFinished={onFinished}
                />
            );
        }

        const handle = workflowExperience.getStepById(step.stepName);
        if (handle instanceof InformationStepHandle) return <InformationUI step={handle} />;
        if (handle instanceof ModuleStepHandle) return <ModuleUI step={handle} />;
        if (handle instanceof QuestionStepHandle) return <QuestionUI step={handle} />;
        if (handle instanceof MaterialStepHandle) return <MaterialUI step={handle} />;
        if (handle instanceof ModelStepHandle) return <ModelUI step={handle} />;
        if (handle instanceof PictureStepHandle) return <PictureUI step={handle} />;
        if (handle instanceof IllustrationStepHandle) return <IllustrationUI step={handle} />;
        if (handle instanceof ShapeStepHandle) return <ShapeUI step={handle} />;
        if (handle instanceof TextStepHandle) return <TextUI step={handle} />;
        if (handle instanceof DigitalContentStepHandle) return <DigitalContentUI step={handle} />;
        if (handle instanceof FrameStepHandle) return <FrameUI step={handle} />;

        return (
            <div>
                <Typography>Unsupported step type: {step.type}</Typography>
            </div>
        );
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
    onNext: () => void | Promise<void>;
}> = ({ workflowExperience, onNext }) => {
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
            <div style={{ flex: "0 0 70%", minWidth: 0, height: "100%" }}>
                <ThreeDPreview workflowExperience={workflowExperience} />
            </div>
            <div
                style={{
                    position: "relative",
                    height: "100%",
                    overflow: "auto",
                    flex: "1 1 0",
                    minWidth: 0,
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
                                <StepHandler
                                    key={step.stepName}
                                    step={step}
                                    workflowExperience={workflowExperience}
                                    onFinished={onNext}
                                />
                            ))}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default Customization;
