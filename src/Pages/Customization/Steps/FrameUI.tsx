import { DragEvent, FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assetService, AssetType, FrameStepHandle, Variant, WorkflowManager } from "@spiffcommerce/core";
import styled from "styled-components";
import Button from "../../../components/button";
import Typography from "../../../components/typography";
import useVariantPrice from "../../../hooks/usePricing";

const DEFAULT_EXTENSIONS = [".jpg", ".jpeg", ".png", ".svg", ".pdf", ".eps", ".ai"];
const VECTOR_MIME_TYPES = ["image/svg+xml", "application/pdf", "application/postscript"];

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

const VariantGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    width: 100%;
    margin-bottom: 16px;
`;

const VariantCard = styled.div<{ $selected?: boolean; $disabled?: boolean }>`
    position: relative;
    aspect-ratio: 1;
    border: 2px solid ${(props) => (props.$selected ? "#007bff" : "#e0e0e0")};
    border-radius: 8px;
    cursor: ${(props) => (props.$disabled ? "not-allowed" : "pointer")};
    overflow: hidden;
    transition: all 0.2s;
    opacity: ${(props) => (props.$disabled ? 0.5 : 1)};

    &:hover {
        border-color: ${(props) => (props.$disabled ? "#e0e0e0" : "#007bff")};
        transform: ${(props) => (props.$disabled ? "none" : "translateY(-2px)")};
        box-shadow: ${(props) => (props.$disabled ? "none" : "0 4px 8px rgba(0, 0, 0, 0.1)")};
    }
`;

const VariantImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

const VariantPrice = styled.span`
    display: block;
    font-size: 11px;
    opacity: 0.8;
`;

const VariantName = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 12px;
    text-align: center;
`;

const UploadZone = styled.div<{ $dragging: boolean }>`
    box-sizing: border-box;
    border: 2px dashed ${(props) => (props.$dragging ? "#007bff" : "#ccc")};
    background-color: ${(props) => (props.$dragging ? "#f0f7ff" : "transparent")};
    border-radius: 8px;
    padding: 24px 16px;
    text-align: center;
    transition: all 0.2s;
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

const ImagePreview = styled.img`
    display: block;
    max-width: 100%;
    max-height: 160px;
    margin: 0 auto 12px auto;
    object-fit: contain;
`;

const HiddenInput = styled.input`
    display: none;
`;

const FrameUI: FunctionComponent<{
    step: FrameStepHandle;
    workflowManager: WorkflowManager;
    onActivation?: () => void;
}> = ({ step, workflowManager, onActivation }) => {
    const getVariantPrice = useVariantPrice();
    const inputRef = useRef<HTMLInputElement>(null);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(() =>
        step.getCurrentVariant()?.getId(),
    );
    const [frameUpdating, setFrameUpdating] = useState(false);
    const [busyMessage, setBusyMessage] = useState<string | undefined>(undefined);
    const [progress, setProgress] = useState<number | undefined>(undefined);
    const [error, setError] = useState("");
    const [dragging, setDragging] = useState(false);
    const [hasUserImage, setHasUserImage] = useState(() => step.hasOriginalImageSelection());
    const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
    const [canRemoveBackground, setCanRemoveBackground] = useState(false);
    const [hasBackgroundRemoved, setHasBackgroundRemoved] = useState(() => step.hasBackgroundRemovedImageSelection());
    const [useOriginal, setUseOriginal] = useState(() => step.getUseOriginalImageSelection());

    const busy = busyMessage !== undefined;
    const extensions = useMemo(() => {
        const whitelisted = step
            .getWhitelistedExtensions()
            .map((extension) => (extension.startsWith(".") ? extension : `.${extension}`).toLowerCase());
        return whitelisted.length > 0 ? whitelisted : DEFAULT_EXTENSIONS;
    }, [step]);

    useEffect(() => {
        step.getAllVariants()
            .then((allVariants) => setVariants(allVariants || []))
            .catch((loadError) => console.error("Error loading frame variants:", loadError));

        if (step.hasOriginalImageSelection()) {
            const load = step.hasBackgroundRemovedImageSelection() && !step.getUseOriginalImageSelection();
            (load ? step.getBackgroundRemovedImageSelection() : step.getOriginalImageSelection())
                .then((asset) => setImageUrl(asset?.fileLink))
                .catch((loadError) => console.error("Error loading frame image:", loadError));
            step.canRemoveBackground()
                .then(setCanRemoveBackground)
                .catch(() => setCanRemoveBackground(false));
        }
    }, [step]);

    const handleVariantClick = useCallback(
        async (variant: Variant) => {
            if (frameUpdating || !variant.isEnabled()) return;

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

    const backgroundButtonLabel = !hasBackgroundRemoved
        ? "Remove Background"
        : useOriginal
          ? "Remove Background"
          : "Use Original Image";

    return (
        <Container data-test-step-type="frame">
            {variants.length > 1 && (
                <>
                    <SectionTitle variant="h3">Choose a frame</SectionTitle>
                    <VariantGrid>
                        {variants.map((variant) => (
                            <VariantCard
                                key={variant.getId()}
                                $selected={selectedVariantId === variant.getId()}
                                $disabled={frameUpdating || !variant.isEnabled()}
                                onClick={() => handleVariantClick(variant)}
                            >
                                {variant.getThumbnail() && (
                                    <VariantImage src={variant.getThumbnail()} alt={variant.getName()} />
                                )}
                                <VariantName>
                                    {variant.getName()}
                                    {getVariantPrice(variant) && (
                                        <VariantPrice>{getVariantPrice(variant)}</VariantPrice>
                                    )}
                                </VariantName>
                            </VariantCard>
                        ))}
                    </VariantGrid>
                </>
            )}
            <UploadZone
                $dragging={dragging}
                onDragOver={(event) => {
                    event.preventDefault();
                    if (!busy) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
            >
                {hasUserImage && imageUrl && <ImagePreview src={imageUrl} alt="Your image" />}
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
                <HelpText variant="p">
                    Drag and drop an image here, or choose a file. Accepted types:{" "}
                    {extensions.map((extension) => extension.slice(1).toUpperCase()).join(", ")}
                </HelpText>
                {hasUserImage && canRemoveBackground && (
                    <Button onClick={handleBackgroundToggle} disabled={busy} fullWidth style={{ marginTop: 12 }}>
                        {backgroundButtonLabel}
                    </Button>
                )}
            </UploadZone>
            {error && <ErrorText variant="p">{error}</ErrorText>}
        </Container>
    );
};

export default FrameUI;
