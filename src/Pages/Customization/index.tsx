import { FunctionComponent, useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import useCurrency from "../../hooks/useCurrency";
import useThemeConfiguration, { useCheckoutOptions, usePageEnabled } from "../../hooks/useThemeConfiguration";
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
import Button from "../../components/button";
import { MEDIA, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH, SIDEBAR_MIN_WIDTH_TOUCH } from "../../layout";
import { useKeyboardViewportHeight, useLayoutMode } from "../../hooks/useLayout";
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

// The preview's height when the keyboard is open in a stacked layout, just enough to keep the design in sight.
const KEYBOARD_PREVIEW_HEIGHT = "96px";

const Layout = styled.div`
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: row;

    /* The preview stays pinned on top while the steps scroll beneath it. */
    @media ${MEDIA.stacked} {
        flex-direction: column;
    }
`;

const PreviewPane = styled.div<{ $collapsed: boolean }>`
    flex: 1 1 0;
    min-width: 0;
    height: 100%;

    /* Phones in landscape and small tablets give the preview a little more than half. */
    @media ${MEDIA.split} and ${MEDIA.short}, ${MEDIA.split} and ${MEDIA.medium} {
        flex: 0 0 55%;
    }

    /* About 4:3, clamped so tall screens don't spend all their height on the preview. */
    @media ${MEDIA.stacked} {
        flex: none;
        height: ${(props) => (props.$collapsed ? KEYBOARD_PREVIEW_HEIGHT : "clamp(32dvh, 75vw, 42dvh)")};
        transition: height 0.2s ease;

        @media ${MEDIA.medium} {
            height: ${(props) => (props.$collapsed ? KEYBOARD_PREVIEW_HEIGHT : "clamp(40dvh, 75vw, 50dvh)")};
        }

        @media (prefers-reduced-motion: reduce) {
            transition: none;
        }
    }
`;

// Holds the scrolling steps and, on small screens, the action bar beneath them.
const Sidebar = styled.div<{ $widthPercentage: number }>`
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    /* Percentages mean very different things on a phone and a 4K monitor, so the width is bounded. */
    flex: 0 0 clamp(${SIDEBAR_MIN_WIDTH}px, ${(props) => props.$widthPercentage}%, ${SIDEBAR_MAX_WIDTH}px);

    @media ${MEDIA.coarse} {
        flex-basis: clamp(${SIDEBAR_MIN_WIDTH_TOUCH}px, ${(props) => props.$widthPercentage}%, ${SIDEBAR_MAX_WIDTH}px);
    }

    @media ${MEDIA.split} and ${MEDIA.short}, ${MEDIA.split} and ${MEDIA.medium} {
        flex: 1 1 0;
    }

    @media ${MEDIA.stacked} {
        flex: 1 1 0;
        height: auto;
    }
`;

const Scroll = styled.div`
    flex: 1 1 0;
    min-height: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 5px;
    -webkit-overflow-scrolling: touch;
`;

// Whether the action bar replaces the total bar: when stacked, and in short landscape.
const actionBarLayouts = `${MEDIA.stacked}, ${MEDIA.short}`;

// Collapses out of the way (rather than just fading) so the steps can use the room.
const ActionBarShell = styled.div<{ $hidden: boolean }>`
    display: none;
    flex: none;
    grid-template-rows: ${(props) => (props.$hidden ? "0fr" : "1fr")};
    visibility: ${(props) => (props.$hidden ? "hidden" : "visible")};
    transition:
        grid-template-rows 0.2s ease,
        visibility 0s linear ${(props) => (props.$hidden ? "0.2s" : "0s")};

    @media ${actionBarLayouts} {
        display: grid;
    }

    @media (prefers-reduced-motion: reduce) {
        transition: none;
    }
`;

const ActionBarClip = styled.div`
    min-height: 0;
    overflow: hidden;
`;

const ActionBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 16px calc(8px + env(safe-area-inset-bottom, 0px));
    background-color: #fff;
    border-top: 1px solid #e0e0e0;
`;

const ActionBarTotal = styled.div`
    display: flex;
    flex-direction: column;
    min-width: 0;
    font-weight: 600;
`;

const SceneTitle = styled(Typography)`
    font-size: var(--theme-scene-heading-size);

    /* Keeps the customer oriented while they scroll through a long scene. */
    @media ${MEDIA.stacked} {
        position: sticky;
        top: 0;
        z-index: 1;
        margin: -15px -15px 0;
        padding: 10px 15px;
        background-color: #fff;
    }
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

    @media ${actionBarLayouts} {
        display: none;
    }
`;

const StepHandler: FunctionComponent<{
    step: Step<AnyStepData>;
    workflowExperience: WorkflowExperience;
    selectionCost: number;
    exportedData: ExportedStepData[];
    onActivate: (stepName: string) => void;
    onFinished: () => void | Promise<void>;
    onRequestQuote: () => void | boolean | Promise<void | boolean>;
}> = ({ step, workflowExperience, selectionCost, exportedData, onActivate, onFinished, onRequestQuote }) => {
    const { addToCartLabel } = useThemeConfiguration();
    const { allowCart, allowQuote } = useCheckoutOptions();
    const reviewPageEnabled = usePageEnabled("review");
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
                    addToCartLabel={addToCartLabel}
                    reviewNext={reviewPageEnabled}
                    allowCart={allowCart}
                    allowQuote={allowQuote}
                    onRequestQuote={onRequestQuote}
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
    onRequestQuote: () => void | boolean | Promise<void | boolean>;
    /** Called whenever the details of the design change. */
    onSummaryChanged?: (summary: { exportedData: ExportedStepData[]; selectionCost: number }) => void;
}> = ({ workflowExperience, onNext, onRequestQuote, onSummaryChanged }) => {
    const [selectionCost, setSelectionCost] = useState(0);
    const [exportedData, setExportedData] = useState<ExportedStepData[]>([]);
    const [traversableScenes, setTraversableScenes] = useState<WorkflowScene[]>([]);
    const [mandatorySteps, setMandatorySteps] = useState<MandatorySteps>({});
    const activeStepName = useRef<string | undefined>(undefined);
    const formatPrice = useCurrency();
    const [finishInView, setFinishInView] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { stacked } = useLayoutMode();
    const keyboardViewportHeight = useKeyboardViewportHeight();
    const { addToCartLabel } = useThemeConfiguration();
    const reviewPageEnabled = usePageEnabled("review");
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
    const handleFinishChecks = useCallback(async () => {
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
    }, [mandatorySteps, traversableScenes, workflowExperience]);

    useEffect(() => {
        onSummaryChanged?.({ exportedData, selectionCost });
    }, [exportedData, selectionCost, onSummaryChanged]);

    const handleFinish = useCallback(async () => {
        await handleFinishChecks();
        await onNext();
    }, [handleFinishChecks, onNext]);

    // A quote needs the same checks as adding to the cart.
    const handleQuote = useCallback(async () => {
        await handleFinishChecks();
        return onRequestQuote();
    }, [handleFinishChecks, onRequestQuote]);

    // Once the finish step is on screen the action bar has nothing left to offer, so it gets out of the way.
    useEffect(() => {
        const container = scrollRef.current;
        const finish = container?.querySelector("[data-finish-scene]");
        if (!container || !finish) {
            setFinishInView(false);
            return;
        }
        const observer = new IntersectionObserver(([entry]) => setFinishInView(entry.isIntersecting), {
            root: container,
        });
        observer.observe(finish);
        return () => observer.disconnect();
    }, [traversableScenes]);

    // The action bar can't complete the design itself (there are terms to accept), so it takes the customer to the finish step.
    const scrollToFinish = useCallback(() => {
        scrollRef.current?.querySelector("[data-finish-scene]")?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, []);

    if (traversableScenes.length === 0) {
        // TODO: spinner
        return <LoadingOverlay />;
    }

    return (
        <PricingProvider showPricing={showPricing} showPlus={showPlus}>
            {/* The keyboard can cover the layout without resizing it, so match the layout to what's visible. */}
            <Layout style={keyboardViewportHeight ? { height: keyboardViewportHeight } : undefined}>
                <PreviewPane $collapsed={stacked && keyboardViewportHeight !== undefined}>
                    <ThreeDPreview workflowExperience={workflowExperience} />
                </PreviewPane>
                <Sidebar $widthPercentage={sidebarWidthPercentage}>
                    <Scroll ref={scrollRef}>
                        {showPricing && formatPrice && totalPrice > 0 && (
                            <TotalBar>
                                <Typography variant="span">Total</Typography>
                                <Typography variant="span">{formatPrice(totalPrice)}</Typography>
                            </TotalBar>
                        )}
                        {traversableScenes.map((scene) => {
                            const isFinishScene = scene.renderableSteps.some((step) => step.type === StepType.Finish);
                            return (
                                <Card key={scene.name} data-finish-scene={isFinishScene ? "" : undefined}>
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
                                            onRequestQuote={handleQuote}
                                        />
                                    ))}
                                </Card>
                            );
                        })}
                    </Scroll>
                    <ActionBarShell $hidden={finishInView}>
                        <ActionBarClip>
                            <ActionBar>
                                <ActionBarTotal>
                                    {showPricing && formatPrice && totalPrice > 0 && (
                                        <>
                                            <Typography variant="span">Total</Typography>
                                            <Typography variant="span">{formatPrice(totalPrice)}</Typography>
                                        </>
                                    )}
                                </ActionBarTotal>
                                <Button onClick={scrollToFinish}>
                                    {reviewPageEnabled ? "Review" : addToCartLabel || "Add to cart"}
                                </Button>
                            </ActionBar>
                        </ActionBarClip>
                    </ActionBarShell>
                </Sidebar>
            </Layout>
        </PricingProvider>
    );
};

export default Customization;
