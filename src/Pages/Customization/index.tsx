import { FunctionComponent, useEffect, useState } from "react";
import styled from "styled-components";
import useCurrency from "../../hooks/useCurrency";
import { PricingProvider } from "../../hooks/usePricing";
import {
    AnyStepData,
    DigitalContentStepHandle,
    ExportedStepData,
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
    onFinished: () => void | Promise<void>;
}> = ({ step, workflowExperience, selectionCost, exportedData, onFinished }) => {
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
    const [selectionCost, setSelectionCost] = useState(0);
    const [exportedData, setExportedData] = useState<ExportedStepData[]>([]);
    const [traversableScenes, setTraversableScenes] = useState<WorkflowScene[]>([]);
    const formatPrice = useCurrency();

    const workflow = workflowExperience.getWorkflow();
    // An unset (null) flag counts as enabled; only an explicit false hides pricing.
    const showPricing = workflow?.showPricing !== false;
    const showPlus = workflow?.showPlusInVariantPrices !== false;
    const totalPrice = (workflowExperience.getProduct()?.basePrice || 0) + selectionCost;

    // TEMPORARY pricing diagnostics - remove once the pricing display is confirmed working.
    useEffect(() => {
        console.log("[pricing-debug]", {
            workflowShowPricing: workflow?.showPricing,
            showPricing,
            hasCurrencyFormatter: !!formatPrice,
            productBasePrice: workflowExperience.getProduct()?.basePrice,
            selectionCost,
            totalPrice,
        });
    }, [workflow, showPricing, formatPrice, workflowExperience, selectionCost, totalPrice]);

    useEffect(() => {
        workflowExperience.getWorkflowManager().addSelectionCallback((callbackOptions) => {
            setSelectionCost(callbackOptions.selectionCost || 0);
            setTraversableScenes(callbackOptions.traversableScenes);
            workflowExperience
                .getExportedStepData()
                .then(setExportedData)
                .catch((error) => console.error("Error loading exported step data:", error));
        });
    }, [workflowExperience]);

    if (traversableScenes.length === 0) {
        // TODO: spinner
        return <LoadingOverlay />;
    }

    return (
        <PricingProvider showPricing={showPricing} showPlus={showPlus}>
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
                                {!isFinishScene && <Typography variant="h2">{scene.title}</Typography>}
                                {scene.renderableSteps.map((step) => (
                                    <StepHandler
                                        key={step.stepName}
                                        step={step}
                                        workflowExperience={workflowExperience}
                                        selectionCost={selectionCost}
                                        exportedData={exportedData}
                                        onFinished={onNext}
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
