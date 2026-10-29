import { DragEvent, FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Asset,
    assetService,
    AssetType,
    FrameService,
    FrameStep,
    FrameStepHandle,
    ImageState,
    Variant,
    WorkflowManager,
} from "@spiffcommerce/core";
import styled from "styled-components";
import Button from "../../../components/button";
import Typography from "../../../components/typography";
import ImageCropper from "../components/ImageCropper";
import VariantGallery from "../components/VariantGallery";

const DEFAULT_EXTENSIONS = [".jpg", ".jpeg", ".png", ".svg", ".pdf", ".eps", ".ai"];
const VECTOR_MIME_TYPES = ["image/svg+xml", "application/pdf", "application/postscript"];

type FrameData = ReturnType<FrameService["getFrameData"]>;
type ImageStateName = "original" | "optimized";

const Container = styled.div`
    padding: 16px;
    box-sizing: border-box;
    width: 100%;
`;

const SectionTitle = styled(Typography)`
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
`;

const Prompt = styled(Typography)`
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #4d4f5c;
`;

const UploadZone = styled.div<{ $dragging: boolean }>`
    box-sizing: border-box;
    margin-top: 16px;
    border: 2px dashed ${(props) => (props.$dragging ? "#007bff" : "#ccc")};
    background-color: ${(props) => (props.$dragging ? "#f0f7ff" : "transparent")};
    border-radius: 8px;
    padding: 16px;
    text-align: center;
    transition: all 0.2s;
`;

const FileName = styled(Typography)`
    margin: 0 0 8px 0;
    font-size: 13px;
    color: #4d4f5c;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const StatusChip = styled.span<{ $tone: "success" | "warning" }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    padding: 4px 10px;
    font-size: 12px;
    border-radius: 12px;
    color: ${(props) => (props.$tone === "success" ? "#1b5e20" : "#8a4b00")};
    background-color: ${(props) => (props.$tone === "success" ? "#e8f5e9" : "#fff3e0")};

    &::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: ${(props) => (props.$tone === "success" ? "#43a047" : "#fb8c00")};
    }
`;

const ToggleGroup = styled.div`
    display: flex;
    justify-content: center;
    margin-bottom: 8px;
`;

const ToggleButton = styled.button<{ $active: boolean }>`
    padding: 4px 16px;
    font-size: 12px;
    cursor: pointer;
    border: 1px solid #007bff;
    color: ${(props) => (props.$active ? "#fff" : "#007bff")};
    background-color: ${(props) => (props.$active ? "#007bff" : "#fff")};

    &:first-child {
        border-radius: 4px 0 0 4px;
    }

    &:last-child {
        border-radius: 0 4px 4px 0;
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }
`;

const OptimizationCard = styled.div`
    margin-top: 12px;
    padding: 12px;
    text-align: left;
    background-color: #fff8e1;
    border: 1px solid #ffe0b2;
    border-radius: 8px;
`;

const OptimizationText = styled(Typography)`
    margin: 0 0 8px 0;
    font-size: 13px;
    color: #4d4f5c;
`;

const PromptButtons = styled.div`
    display: flex;
    gap: 8px;
`;

const WarningAlert = styled(Typography)`
    margin: 12px 0 0 0;
    padding: 8px 12px;
    font-size: 12px;
    text-align: left;
    color: #8a4b00;
    background-color: #fff3e0;
    border-radius: 4px;
`;

const HelpText = styled(Typography)`
    margin: 8px 0 0 0;
    font-size: 12px;
    color: #666;
`;

const ErrorText = styled(Typography)`
    margin: 12px 0 0 0;
    font-size: 13px;
    color: #d32f2f;
`;

const ProgressBar = styled.div`
    width: 100%;
    height: 8px;
    background-color: #e0e0e0;
    border-radius: 4px;
    margin-top: 12px;
    overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number }>`
    height: 100%;
    width: ${(props) => props.$progress}%;
    background-color: #007bff;
    transition: width 0.3s;
`;

const CropperSection = styled.div`
    margin-bottom: 12px;
    text-align: left;
`;

const ButtonSpacing = styled.div`
    margin-top: 12px;
`;

const HiddenInput = styled.input`
    display: none;
`;

const FrameUI: FunctionComponent<{
    step: FrameStepHandle;
    workflowManager: WorkflowManager;
    onActivation?: () => void;
}> = ({ step, workflowManager, onActivation }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const preOptimization = useRef<{ asset: Asset; state: "original" | "removeBG" } | undefined>(undefined);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(() =>
        step.getCurrentVariant()?.getId(),
    );
    const [frameData, setFrameData] = useState<FrameData>(() => step.getFrameService()?.getFrameData());
    const [frameUpdating, setFrameUpdating] = useState(false);
    const [busyMessage, setBusyMessage] = useState<string | undefined>(undefined);
    const [progress, setProgress] = useState<number | undefined>(undefined);
    const [error, setError] = useState("");
    const [dragging, setDragging] = useState(false);
    const [hasUserImage, setHasUserImage] = useState(() => step.hasOriginalImageSelection());
    const [currentImageAsset, setCurrentImageAsset] = useState<Asset | undefined>(undefined);
    const [fileName, setFileName] = useState<string | undefined>(undefined);
    const [canRemoveBackground, setCanRemoveBackground] = useState(false);
    const [hasBackgroundRemoved, setHasBackgroundRemoved] = useState(() => step.hasBackgroundRemovedImageSelection());
    const [useOriginal, setUseOriginal] = useState(() => step.getUseOriginalImageSelection());
    const [showOptimizePrompt, setShowOptimizePrompt] = useState(false);
    const [imageState, setImageState] = useState<ImageStateName>(() =>
        step.getCurrentImageState() === ImageState.Optimized ? "optimized" : "original",
    );

    const busy = busyMessage !== undefined;
    const frameService = step.getFrameService();
    const imageUrl = currentImageAsset?.fileLink;
    const extensions = useMemo(() => {
        const whitelisted = step
            .getWhitelistedExtensions()
            .map((extension) => (extension.startsWith(".") ? extension : `.${extension}`).toLowerCase());
        return whitelisted.length > 0 ? whitelisted : DEFAULT_EXTENSIONS;
    }, [step]);
    const currentFrameStep = step.getCurrentFrameStep(
        frameData?.[0] as Parameters<FrameStepHandle["getCurrentFrameStep"]>[0],
        busy,
        hasUserImage,
        variants.map((variant) => variant.getResource()),
    );

    // Optimization is only needed for raster images, and only when the step is configured to vectorize.
    const imageData = frameService?.getImageData();
    const shouldVectorize = step.getShouldVectorize();
    const hasVectorized = step.hasVectorizedImageSelection();
    const needsOptimization = currentImageAsset?.type === AssetType.Image && !!imageData;
    const minimumSize = step.getMinimumPixelThresholdForOptimization();
    const needsEnhancement =
        needsOptimization &&
        !!minimumSize &&
        !!imageData &&
        (imageData.width < minimumSize || imageData.height < minimumSize);
    const canToggleImageState = step.hasOriginalImageSelection() && hasVectorized;

    useEffect(() => {
        step.onFrameDataChanged(setFrameData);
    }, [step]);

    useEffect(() => {
        step.getAllVariants()
            .then((allVariants) => setVariants(allVariants || []))
            .catch((loadError) => console.error("Error loading frame variants:", loadError));

        if (step.hasOriginalImageSelection()) {
            const coreState = step.getCurrentImageState();
            const useBackgroundRemoved =
                step.hasBackgroundRemovedImageSelection() && !step.getUseOriginalImageSelection();
            const load =
                coreState === ImageState.Optimized
                    ? step.getVectorizedImageSelection()
                    : useBackgroundRemoved
                      ? step.getBackgroundRemovedImageSelection()
                      : step.getOriginalImageSelection();
            load.then((asset) => {
                setCurrentImageAsset(asset);
                setFileName((current) => current ?? asset?.key?.split("/").pop());
            }).catch((loadError) => console.error("Error loading frame image:", loadError));
            step.canUseAdvancedImageManipulation()
                .then(setCanRemoveBackground)
                .catch(() => setCanRemoveBackground(false));
        }
    }, [step]);

    const handleVariantSelect = useCallback(
        async (variant: Variant) => {
            if (frameUpdating) return;

            setSelectedVariantId(variant.getId());
            setFrameUpdating(true);
            onActivation?.();

            try {
                await step.selectVariant(variant);
            } catch (selectError) {
                console.error("Error selecting frame variant:", selectError);
            } finally {
                setFrameUpdating(false);
            }
        },
        [frameUpdating, onActivation, step],
    );

    const uploadFile = useCallback(
        async (file: File) => {
            const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
            if (!extensions.includes(extension)) {
                setError(`Unsupported file type. Accepted types: ${extensions.join(", ")}`);
                return;
            }

            setError("");
            setShowOptimizePrompt(false);
            setProgress(0);
            setBusyMessage("Uploading photo...");
            workflowManager.setMandatoryFulfilled(step.getId(), false);
            const updateId = workflowManager.markUpdatePending();

            try {
                const isRaster = !VECTOR_MIME_TYPES.includes(file.type);
                const fileInfo = isRaster
                    ? await assetService.loadImageAsFileInfo(file)
                    : { name: file.name, blob: new Blob([file], { type: file.type }) };
                const asset = await assetService.uploadAssetWithProgress(
                    fileInfo,
                    isRaster ? AssetType.Image : AssetType.Illustration,
                    (value) => setProgress(Math.max(0, Math.min(value, 100))),
                    true,
                );
                onActivation?.();
                await step.selectImage(asset);
                preOptimization.current = undefined;
                setCurrentImageAsset(asset);
                setFileName(file.name);
                setHasUserImage(true);
                setHasBackgroundRemoved(false);
                setUseOriginal(false);
                setImageState("original");
                setCanRemoveBackground(await step.canRemoveBackground());
            } catch (uploadError) {
                console.error("Error uploading frame image:", uploadError);
                setError("The image could not be uploaded or applied. Please try another file.");
            } finally {
                workflowManager.markUpdateCompleted(updateId);
                setProgress(undefined);
                setBusyMessage(undefined);
            }
        },
        [extensions, onActivation, step, workflowManager],
    );

    const handleFileSelect = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            // Allow selecting the same file again later.
            event.target.value = "";
            if (file) {
                uploadFile(file);
            }
        },
        [uploadFile],
    );

    const handleDrop = useCallback(
        (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setDragging(false);
            if (busy || event.dataTransfer.files.length !== 1) return;
            uploadFile(event.dataTransfer.files[0]);
        },
        [busy, uploadFile],
    );

    const handleBackgroundToggle = useCallback(async () => {
        onActivation?.();
        setError("");
        try {
            if (hasBackgroundRemoved) {
                const target = useOriginal
                    ? await step.getBackgroundRemovedImageSelection()
                    : await step.getOriginalImageSelection();
                if (target) {
                    setBusyMessage("Applying image...");
                    await step.selectImage(target, false, false);
                    setCurrentImageAsset(target);
                    setUseOriginal(!useOriginal);
                }
            } else {
                setBusyMessage("Removing background...");
                const asset = await step.removeBackgroundFromImageSelection();
                setCurrentImageAsset(asset);
                setHasBackgroundRemoved(true);
                setUseOriginal(false);
            }
        } catch (backgroundError) {
            console.error("Error changing image background:", backgroundError);
            setError("The background could not be changed. Please try again.");
        } finally {
            setBusyMessage(undefined);
        }
    }, [hasBackgroundRemoved, onActivation, step, useOriginal]);

    const optimize = useCallback(
        async (removeBackground: boolean) => {
            if (!currentImageAsset) return;

            setShowOptimizePrompt(false);
            setError("");
            onActivation?.();
            const stageCount = (needsEnhancement ? 1 : 0) + (removeBackground ? 1 : 0) + 1;
            let completedStages = 0;
            const startStage = (message: string) => {
                setBusyMessage(message);
                setProgress(Math.round((completedStages / stageCount) * 100));
            };
            startStage("Optimising...");
            const updateId = workflowManager.markUpdatePending();
            if (currentImageAsset.key) {
                assetService.removePersistedAsset(currentImageAsset.key);
            }

            try {
                let asset = currentImageAsset;
                const startedFrom = currentImageAsset;

                if (needsEnhancement && minimumSize && imageData) {
                    startStage("AI Rendering...");
                    asset = await step.enhanceWithAI(asset, {
                        targetWidth: Math.max(imageData.width, minimumSize),
                        targetHeight: Math.max(imageData.height, minimumSize),
                        quality: "standard",
                    });
                    setCurrentImageAsset(asset);
                    completedStages++;
                }

                if (removeBackground) {
                    startStage("Removing background...");
                    asset = await step.removeBackgroundFromImageSelection(!needsEnhancement);
                    setHasBackgroundRemoved(true);
                    if (needsEnhancement) {
                        await step.selectImage(asset, false, false);
                    }
                    setCurrentImageAsset(asset);
                    completedStages++;
                }

                startStage("Optimising...");
                preOptimization.current = removeBackground
                    ? { asset, state: "removeBG" }
                    : { asset: startedFrom, state: useOriginal ? "original" : "removeBG" };
                const vectorized = await step.vectorize(asset, step.getVectorizeMaxColors());
                setCurrentImageAsset(vectorized);
                setImageState("optimized");
                setProgress(100);
            } catch (optimizeError) {
                console.error("Error optimising image:", optimizeError);
                setError("The image could not be optimised. Please try again.");
            } finally {
                workflowManager.markUpdateCompleted(updateId);
                setProgress(undefined);
                setBusyMessage(undefined);
            }
        },
        [currentImageAsset, imageData, minimumSize, needsEnhancement, onActivation, step, useOriginal, workflowManager],
    );

    const handleImageStateChange = useCallback(
        async (newState: ImageStateName) => {
            if (newState === imageState || busy) return;

            const previousState = imageState;
            setImageState(newState);
            setBusyMessage("Applying image...");
            setError("");
            onActivation?.();

            try {
                let asset: Asset | undefined;
                const before = preOptimization.current;
                if (previousState === "optimized" && newState === "original" && before?.state === "original") {
                    await step.selectImage(before.asset, true, true);
                    asset = before.asset;
                    setUseOriginal(true);
                } else if (newState === "original") {
                    await step.setImageState(ImageState.Original);
                    asset = await step.getOriginalImageSelection();
                    setUseOriginal(true);
                } else {
                    await step.setImageState(ImageState.Optimized);
                    asset = await step.getVectorizedImageSelection();
                }
                if (asset) {
                    setCurrentImageAsset(asset);
                }
            } catch (stateError) {
                console.error("Error switching image state:", stateError);
                setImageState(previousState);
                setError("The image could not be switched. Please try again.");
            } finally {
                setBusyMessage(undefined);
            }
        },
        [busy, imageState, onActivation, step],
    );

    const backgroundButtonLabel = hasBackgroundRemoved && !useOriginal ? "Use Original Image" : "Remove Background";
    const backgroundIsRemoved = hasBackgroundRemoved && !useOriginal;
    const showOptimizationCard = hasUserImage && needsOptimization && !hasVectorized && shouldVectorize;
    const showBackgroundButton =
        hasUserImage && canRemoveBackground && currentImageAsset?.type === AssetType.Image && !hasVectorized;

    return (
        <Container data-test-step-type="frame">
            {currentFrameStep === FrameStep.SelectFrame && <Prompt variant="p">Select a frame to begin</Prompt>}
            {variants.length > 1 && (
                <>
                    <SectionTitle variant="h3">Choose a frame</SectionTitle>
                    <VariantGallery
                        variants={variants}
                        selectedVariantId={selectedVariantId}
                        disabled={frameUpdating}
                        categoriesEnabled={step.isVariantCategoriesEnabled()}
                        onSelect={handleVariantSelect}
                    />
                </>
            )}
            {currentFrameStep !== FrameStep.SelectFrame && (
                <UploadZone
                    $dragging={dragging}
                    onDragOver={(event) => {
                        event.preventDefault();
                        if (!busy) setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                >
                    {hasUserImage && frameService && (
                        <CropperSection>
                            {shouldVectorize && !busy && (
                                <StatusChip
                                    $tone={
                                        hasVectorized
                                            ? imageState === "optimized"
                                                ? "success"
                                                : "warning"
                                            : needsOptimization
                                              ? "warning"
                                              : "success"
                                    }
                                >
                                    {hasVectorized
                                        ? imageState === "optimized"
                                            ? "Print ready"
                                            : "Not print ready, manual review required"
                                        : needsOptimization
                                          ? "Not print ready, please optimise to continue"
                                          : "Production ready"}
                                </StatusChip>
                            )}
                            {canToggleImageState && (
                                <ToggleGroup>
                                    <ToggleButton
                                        type="button"
                                        $active={imageState === "original"}
                                        disabled={busy}
                                        onClick={() => handleImageStateChange("original")}
                                    >
                                        Original
                                    </ToggleButton>
                                    <ToggleButton
                                        type="button"
                                        $active={imageState === "optimized"}
                                        disabled={busy}
                                        onClick={() => handleImageStateChange("optimized")}
                                    >
                                        Optimized
                                    </ToggleButton>
                                </ToggleGroup>
                            )}
                            {fileName && <FileName variant="p">{fileName}</FileName>}
                            <ImageCropper
                                key={imageUrl}
                                frameService={frameService}
                                overlayImageUrl={step.hasOverlayImageUrl() || undefined}
                            />
                        </CropperSection>
                    )}
                    {showOptimizationCard && (
                        <OptimizationCard>
                            {!showOptimizePrompt ? (
                                <>
                                    <OptimizationText variant="p">Needs optimisation for print</OptimizationText>
                                    <Button fullWidth disabled={busy} onClick={() => setShowOptimizePrompt(true)}>
                                        Optimize image
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <OptimizationText variant="p">
                                        {backgroundIsRemoved
                                            ? "Return background before optimizing?"
                                            : "Remove the background before optimising?"}
                                    </OptimizationText>
                                    <PromptButtons>
                                        <Button
                                            fullWidth
                                            disabled={!canRemoveBackground || busy}
                                            onClick={() => optimize(true)}
                                        >
                                            {backgroundIsRemoved ? "Restore BG first" : "Remove BG first"}
                                        </Button>
                                        <Button fullWidth disabled={busy} onClick={() => optimize(false)}>
                                            Keep background
                                        </Button>
                                    </PromptButtons>
                                    <ButtonSpacing>
                                        <Button fullWidth disabled={busy} onClick={() => setShowOptimizePrompt(false)}>
                                            Cancel
                                        </Button>
                                    </ButtonSpacing>
                                </>
                            )}
                        </OptimizationCard>
                    )}
                    <ButtonSpacing>
                        <HiddenInput
                            ref={inputRef}
                            type="file"
                            accept={extensions.join(",")}
                            onChange={handleFileSelect}
                            disabled={busy}
                        />
                        <Button onClick={() => inputRef.current?.click()} disabled={busy} fullWidth>
                            {busyMessage ?? (hasUserImage ? "Replace Image" : "Upload Image")}
                        </Button>
                    </ButtonSpacing>
                    {progress !== undefined && (
                        <ProgressBar>
                            <ProgressFill $progress={progress} />
                        </ProgressBar>
                    )}
                    {!hasUserImage && (
                        <HelpText variant="p">
                            Drag and drop an image here, or choose a file. Accepted types:{" "}
                            {extensions.map((extension) => extension.slice(1).toUpperCase()).join(", ")}
                        </HelpText>
                    )}
                    {showBackgroundButton && (
                        <ButtonSpacing>
                            <Button onClick={handleBackgroundToggle} disabled={busy} fullWidth>
                                {backgroundButtonLabel}
                            </Button>
                        </ButtonSpacing>
                    )}
                    {hasUserImage && imageState === "original" && hasVectorized && shouldVectorize && (
                        <WarningAlert variant="p">
                            This selected asset is not print ready and will need manual review before the order is
                            produced.
                        </WarningAlert>
                    )}
                </UploadZone>
            )}
            {error && <ErrorText variant="p">{error}</ErrorText>}
        </Container>
    );
};

export default FrameUI;
