import { DragEvent, FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    assetService,
    AssetType,
    FrameService,
    FrameStep,
    FrameStepHandle,
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
    const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
    const [fileName, setFileName] = useState<string | undefined>(undefined);
    const [canRemoveBackground, setCanRemoveBackground] = useState(false);
    const [hasBackgroundRemoved, setHasBackgroundRemoved] = useState(() => step.hasBackgroundRemovedImageSelection());
    const [useOriginal, setUseOriginal] = useState(() => step.getUseOriginalImageSelection());

    const busy = busyMessage !== undefined;
    const frameService = step.getFrameService();
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

    useEffect(() => {
        step.onFrameDataChanged(setFrameData);
    }, [step]);

    useEffect(() => {
        step.getAllVariants()
            .then((allVariants) => setVariants(allVariants || []))
            .catch((loadError) => console.error("Error loading frame variants:", loadError));

        if (step.hasOriginalImageSelection()) {
            const useBackgroundRemoved =
                step.hasBackgroundRemovedImageSelection() && !step.getUseOriginalImageSelection();
            (useBackgroundRemoved ? step.getBackgroundRemovedImageSelection() : step.getOriginalImageSelection())
                .then((asset) => {
                    setImageUrl(asset?.fileLink);
                    setFileName((current) => current ?? asset?.key?.split("/").pop());
                })
                .catch((loadError) => console.error("Error loading frame image:", loadError));
            step.canRemoveBackground()
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
                setImageUrl(asset.fileLink);
                setFileName(file.name);
                setHasUserImage(true);
                setHasBackgroundRemoved(false);
                setUseOriginal(false);
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
                    setImageUrl(target.fileLink);
                    setUseOriginal(!useOriginal);
                }
            } else {
                setBusyMessage("Removing background...");
                const asset = await step.removeBackgroundFromImageSelection();
                setImageUrl(asset.fileLink);
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

    const backgroundButtonLabel = hasBackgroundRemoved && !useOriginal ? "Use Original Image" : "Remove Background";

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
                            {fileName && <FileName variant="p">{fileName}</FileName>}
                            <ImageCropper
                                key={imageUrl}
                                frameService={frameService}
                                overlayImageUrl={step.hasOverlayImageUrl() || undefined}
                            />
                        </CropperSection>
                    )}
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
                    {hasUserImage && canRemoveBackground && (
                        <ButtonSpacing>
                            <Button onClick={handleBackgroundToggle} disabled={busy} fullWidth>
                                {backgroundButtonLabel}
                            </Button>
                        </ButtonSpacing>
                    )}
                </UploadZone>
            )}
            {error && <ErrorText variant="p">{error}</ErrorText>}
        </Container>
    );
};

export default FrameUI;
