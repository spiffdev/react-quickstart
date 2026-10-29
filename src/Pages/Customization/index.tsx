import { FunctionComponent, useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import useCurrency from "../../hooks/useCurrency";
import useThemeConfiguration from "../../hooks/useThemeConfiguration";
import { PricingProvider } from "../../hooks/usePricing";
import { canDownloadPreview, downloadPreview } from "./downloadPreview";
import {
    AnyStepData,
    DigitalContentStepHandle,
    ExportedStepData,
    FrameStepHandle,
    IllustrationStepHandle,
    InformationStepHandle,
    MandatorySteps,
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
import StepHelp from "./components/StepHelp";
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

// Only these step types can be marked as mandatory, matching Beeline.
const STEP_TYPES_WITH_MANDATORY_SUPPORT = [
    StepType.Frame,
    StepType.Illustration,
    StepType.Module,
    StepType.Picture,
    StepType.Question,
    StepType.Text,
    StepType.Model,
    StepType.DigitalContent,
];

const DEFAULT_SIDEBAR_WIDTH_PERCENTAGE = 25;

const SceneTitle = styled(Typography)`
    font-size: var(--theme-scene-heading-size);
`;

const StepTitle = styled(Typography)`
    font-size: var(--theme-step-heading-size);
`;

const StepHeading = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const TotalBar = styled.div`
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
    background-color: #fff;
    border-bottom: 1px solid #e0e0e0;
    font-weight: 600;
`;

const StepHandler: FunctionComponent<{
    step: Step<AnyStepData>;
    workflowExperience: WorkflowExperience;
    selectionCost: number;
    exportedData: ExportedStepData[];
    onActivate: (stepName: string) => void;
    onFinished: () => void | Promise<void>;
}> = ({ step, workflowExperience, selectionCost, exportedData, onActivate, onFinished }) => {
    const renderStepComponent = () => {
        // The finish step has no handle.
        if (step.type === StepType.Finish) {
            const workflow = workflowExperience.getWorkflow();
            return (
                <FinishUI
                    termsMarkdown={workflow?.finalizeStepConfig?.termsMarkdown}
                    exportedData={exportedData}
                    basePrice={workflowExperience.getProduct()?.basePrice || 0}
                    selectionCost={selectionCost}
                    showPricing={workflow?.showPricing !== false}
                    onDownloadPreview={
                        canDownloadPreview(workflowExperience) ? () => downloadPreview(workflowExperience) : undefined
                    }
                    onFinished={onFinished}
                />
            );
        }

        // An introduction only has a heading, so there's nothing to show under it.
        if (step.type === StepType.Introduction) {
            return null;
        }

        const handle = workflowExperience.getStepById(step.stepName);
        const onActivation = () => onActivate(step.stepName);
        if (handle instanceof InformationStepHandle) return <InformationUI step={handle} />;
        if (handle instanceof ModuleStepHandle) {
            return (
                <ModuleUI
                    step={handle}
                    workflowManager={workflowExperience.getWorkflowManager()}
                    onActivation={onActivation}
                />
            );
        }
        if (handle instanceof QuestionStepHandle) return <QuestionUI step={handle} onActivation={onActivation} />;
        if (handle instanceof MaterialStepHandle) return <MaterialUI step={handle} onActivation={onActivation} />;
        if (handle instanceof ModelStepHandle) return <ModelUI step={handle} onActivation={onActivation} />;
        if (handle instanceof PictureStepHandle) return <PictureUI step={handle} onActivation={onActivation} />;
        if (handle instanceof IllustrationStepHandle) {
            return (
                <IllustrationUI
                    step={handle}
                    workflowManager={workflowExperience.getWorkflowManager()}
                    onActivation={onActivation}
                />
            );
        }
        if (handle instanceof ShapeStepHandle) return <ShapeUI step={handle} onActivation={onActivation} />;
        if (handle instanceof TextStepHandle) {
            return (
                <TextUI
                    step={handle}
                    workflowManager={workflowExperience.getWorkflowManager()}
                    onActivation={onActivation}
                />
            );
        }
        if (handle instanceof DigitalContentStepHandle) {
            return (
                <DigitalContentUI
                    step={handle}
                    workflowManager={workflowExperience.getWorkflowManager()}
                    onActivation={onActivation}
                />
            );
        }
        if (handle instanceof FrameStepHandle) {
            return (
                <FrameUI
                    step={handle}
                    workflowManager={workflowExperience.getWorkflowManager()}
                    onActivation={onActivation}
                />
            );
        }

        return (
            <div>
                <Typography>Unsupported step type: {step.type}</Typography>
            </div>
        );
    };

    const isFinishStep = step.type === StepType.Finish;

    return (
        <div>
            {!isFinishStep && (
                <StepHeading>
                    <StepTitle variant="h3">{step.stepTitle}</StepTitle>
                    {step.helpText && <StepHelp helpText={step.helpText} />}
                </StepHeading>
            )}
            {renderStepComponent()}
        </div>
    );
};

const Customization: FunctionComponent<{
    workflowExperience: WorkflowExperience;
    onNext: () => void | Promise<void>;
}> = ({ workflowExperience, onNext }) => {
    const [selectionCost, setSelectionCost] = useState(0);
    const [exportedData, setExportedData] = useState<ExportedStepData[]>([]);
    const [traversableScenes, setTraversableScenes] = useState<WorkflowScene[]>([]);
    const [mandatorySteps, setMandatorySteps] = useState<MandatorySteps>({});
    const activeStepName = useRef<string | undefined>(undefined);
    const formatPrice = useCurrency();
    const sidebarWidthPercentage = useThemeConfiguration().sidebarWidthPercentage || DEFAULT_SIDEBAR_WIDTH_PERCENTAGE;

    const workflow = workflowExperience.getWorkflow();
    // An unset (null) flag counts as enabled; only an explicit false hides pricing.
    const showPricing = workflow?.showPricing !== false;
    const showPlus = workflow?.showPlusInVariantPrices !== false;
    const totalPrice = (workflowExperience.getProduct()?.basePrice || 0) + selectionCost;

    useEffect(() => {
        const manager = workflowExperience.getWorkflowManager();
        manager.addMandatoryCallback(setMandatorySteps);
        manager.addSelectionCallback((callbackOptions) => {
            setSelectionCost(callbackOptions.selectionCost || 0);
            setTraversableScenes(callbackOptions.traversableScenes);
            workflowExperience
                .getExportedStepData()
                .then(setExportedData)
                .catch((error) => console.error("Error loading exported step data:", error));
        });
    }, [workflowExperience]);

    // When the customer first interacts with a different step, play that step's camera and model animations.
    const handleActivation = useCallback(
        (stepName: string) => {
            if (activeStepName.current === stepName) return;
            activeStepName.current = stepName;
            workflowExperience.getStepById(stepName)?.executeAnimations();
        },
        [workflowExperience],
    );

    // Throws an error with a customer-readable message when the design isn't ready to be finished.
    const handleFinish = useCallback(async () => {
        const manager = workflowExperience.getWorkflowManager();
        if (manager.getUpdatesPending()) {
            throw new Error("Your design is still updating. Please wait a moment and try again.");
        }

        const validationErrors = manager.getValidationErrors();
        for (const scene of traversableScenes) {
            for (const step of scene.renderableSteps) {
                if (step.mandatory && STEP_TYPES_WITH_MANDATORY_SUPPORT.includes(step.type)) {
                    if (!mandatorySteps[step.stepName]) {
                        throw new Error(`"${step.stepTitle}" is required before you can continue.`);
                    }
                }
                if (validationErrors.steps.has(step.stepName)) {
                    throw new Error(`Please check "${step.stepTitle}" before you continue.`);
                }
            }
        }

        await onNext();
    }, [mandatorySteps, onNext, traversableScenes, workflowExperience]);

    if (traversableScenes.length === 0) {
        // TODO: spinner
        return <LoadingOverlay />;
    }

    return (
        <PricingProvider showPricing={showPricing} showPlus={showPlus}>
            <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "row" }}>
                <div style={{ flex: "1 1 0", minWidth: 0, height: "100%" }}>
                    <ThreeDPreview workflowExperience={workflowExperience} />
                </div>
                <div
                    style={{
                        position: "relative",
                        height: "100%",
                        overflow: "auto",
                        flex: `0 0 ${sidebarWidthPercentage}%`,
                        minWidth: 0,
                        gap: "5px",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {showPricing && formatPrice && totalPrice > 0 && (
                        <TotalBar>
                            <Typography variant="span">Total</Typography>
                            <Typography variant="span">{formatPrice(totalPrice)}</Typography>
                        </TotalBar>
                    )}
                    {traversableScenes.map((scene) => {
                        const isFinishScene = scene.renderableSteps.some((step) => step.type === StepType.Finish);
                        return (
                            <Card key={scene.name}>
                                {!isFinishScene && <SceneTitle variant="h2">{scene.title}</SceneTitle>}
                                {scene.renderableSteps.map((step) => (
                                    <StepHandler
                                        key={step.stepName}
                                        step={step}
                                        workflowExperience={workflowExperience}
                                        selectionCost={selectionCost}
                                        exportedData={exportedData}
                                        onActivate={handleActivation}
                                        onFinished={handleFinish}
                                    />
                                ))}
                            </Card>
                        );
                    })}
                </div>
            </div>
        </PricingProvider>
    );
};

export default Customization;
