import { FunctionComponent, useCallback, useEffect, useRef, useState } from "react";
import {
    Asset,
    AssetType,
    ColorDefinition,
    FileUploadGlobalPropertyHandle,
    MobileUploadSession,
    assetService,
    browserColorToHex,
    matchHexToPms,
} from "@spiffcommerce/core";
import { Eraser, Replace, Smartphone, Sparkles, Undo2, Upload } from "lucide-react";
import styled from "styled-components";
import Button from "../../components/button";
import Typography from "../../components/typography";
import useBundle from "../../hooks/useBundle";
import useTheme from "../../hooks/useTheme";
import useThemeConfiguration from "../../hooks/useThemeConfiguration";
import MobileUploadQR from "../Customization/components/MobileUploadQR";
import SVGColorSelector, { ReplacementColor } from "../Customization/components/SVGColorSelector";

const DEFAULT_EXTENSIONS = [".jpg", ".jpeg", ".png", ".svg", ".pdf", ".eps", ".ai"];
const VECTOR_MIME_TYPES = ["image/svg+xml", "application/pdf", "application/postscript"];
const PMS_MAX_DISTANCE = 64;

type Colors = { [key: string]: ColorDefinition };

const Body = styled.div`
    margin-top: 8px;
`;

const HiddenInput = styled.input`
    display: none;
`;

const Thumbnail = styled.img`
    display: block;
    max-width: 100%;
    max-height: 160px;
    margin: 0 auto 12px;
    object-fit: contain;
`;

const Actions = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Editor = styled.div`
    margin-top: 12px;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 8px;
`;

const Help = styled(Typography)`
    margin: 8px 0 0 0;
    font-size: 12px;
    color: #666;
`;

const ErrorText = styled(Typography)`
    margin: 8px 0 0 0;
    font-size: 13px;
    color: #d32f2f;
`;

const ProgressBar = styled.div`
    height: 4px;
    margin-top: 8px;
    border-radius: 2px;
    background-color: #e0e0e0;
    overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number }>`
    width: ${(props) => props.$progress}%;
    height: 100%;
    background-color: var(--theme-primary-color);
    transition: width 0.2s;
`;

/** Gives each color its closest PMS value when it doesn't have one. */
const withPmsValues = (colors: Colors): Colors =>
    Object.fromEntries(
        Object.entries(colors).map(([key, color]) => [
            key,
            color.pmsValue
                ? color
                : {
                      ...color,
                      pmsValue: matchHexToPms(browserColorToHex(color.browserValue), PMS_MAX_DISTANCE)[0]?.pms,
                  },
        ]),
    );

/**
 * An image shared by every product. Besides uploading, the customer can remove its background and optimise it for
 * print, and edit its colors, when the integration and the property are set up for it.
 */
const FileUploadProperty: FunctionComponent<{ handle: FileUploadGlobalPropertyHandle }> = ({ handle }) => {
    const bundle = useBundle();
    const inputRef = useRef<HTMLInputElement>(null);
    const theme = useTheme();
    const { enableMobileUpload: mobileUploadSetting, enableLocalUpload: localUploadSetting } = useThemeConfiguration();
    // Local upload is on unless it has been explicitly turned off, and mobile upload then always is.
    const enableLocalUpload = localUploadSetting !== false;
    const enableMobileUpload = !!mobileUploadSetting || !enableLocalUpload;
    const extensions = DEFAULT_EXTENSIONS;

    const [image, setImage] = useState<Asset | undefined>(undefined);
    const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
    const [hasImage, setHasImage] = useState(() => handle.hasImage());
    const [hasBackgroundRemoved, setHasBackgroundRemoved] = useState(false);
    const [useOriginal, setUseOriginal] = useState(() => handle.getUseOriginalImage());
    const [optimised, setOptimised] = useState(false);
    const [canManipulate, setCanManipulate] = useState(false);
    const [colors, setColors] = useState<Colors | undefined>(undefined);
    const [originalColors, setOriginalColors] = useState<ReplacementColor[]>([]);
    const [busy, setBusy] = useState<string | undefined>(undefined);
    const [progress, setProgress] = useState<number | undefined>(undefined);
    const [error, setError] = useState("");
    const [mobileSession, setMobileSession] = useState<MobileUploadSession | undefined>(undefined);

    // Reads everything the controls depend on back from the property.
    const refresh = useCallback(async () => {
        const [current, backgroundRemoved] = await Promise.all([handle.getImage(), handle.getBackgroundRemovedImage()]);
        // Reading the preview loads the image's colors, which the color editor needs.
        const preview = await handle.getImageWithColors();
        const storage = bundle.getGlobalPropertyStateManager().getAspectStorage(handle.getName()) as
            { vectorizedAssetKey?: string } | undefined;
        setImage(current);
        setPreviewUrl(preview ?? current?.fileLink);
        setHasImage(handle.hasImage());
        setHasBackgroundRemoved(!!backgroundRemoved);
        setUseOriginal(handle.getUseOriginalImage());
        setOptimised(!!storage?.vectorizedAssetKey);
        const currentColors = handle.getCurrentColors();
        setColors(currentColors && Object.keys(currentColors).length > 0 ? withPmsValues(currentColors) : undefined);
        const original = await handle.getOriginalColors();
        setOriginalColors(
            Object.entries(original ?? {}).map(([key, definition]) => ({
                fill: definition.browserValue,
                stroke: definition.browserValue,
                variant: { id: key, name: "", priceModifier: 0, enabled: true },
                pmsValue: matchHexToPms(browserColorToHex(definition.browserValue), PMS_MAX_DISTANCE)[0]?.pms,
            })),
        );
    }, [bundle, handle]);

    useEffect(() => {
        handle
            .canUseAdvancedImageManipulation()
            .then(setCanManipulate)
            .catch(() => setCanManipulate(false));
        refresh().catch((loadError) => console.error("Error loading the shared image:", loadError));
    }, [handle, refresh]);

    // Runs a change to the image, then reads the result back.
    const run = useCallback(
        async (message: string, failure: string, action: () => Promise<void>) => {
            setError("");
            setBusy(message);
            try {
                await action();
                await refresh();
            } catch (actionError) {
                console.error(failure, actionError);
                setError(failure);
            } finally {
                setProgress(undefined);
                setBusy(undefined);
            }
        },
        [refresh],
    );

    const apply = useCallback((asset: Asset) => handle.selectImage(asset), [handle]);

    const upload = useCallback(
        (file: File) => {
            const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
            if (!extensions.includes(extension)) {
                setError(`Unsupported file type. Accepted types: ${extensions.join(", ")}`);
                return;
            }
            setProgress(0);
            return run(
                "Uploading...",
                "The image could not be uploaded or applied. Please try another file.",
                async () => {
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
                    await apply(asset);
                },
            );
        },
        [apply, extensions, run],
    );

    const startMobileUpload = useCallback(async () => {
        try {
            setError("");
            setMobileSession(await handle.createMobileUploadSession({ primaryColor: theme.primaryColor }));
        } catch (mobileError) {
            console.error("Failed to start a mobile upload:", mobileError);
            setError("A mobile upload could not be started. Please try again.");
        }
    }, [handle, theme.primaryColor]);

    const finishMobileUpload = useCallback(
        (asset: Asset) => {
            setMobileSession(undefined);
            return run("Applying...", "The image could not be applied. Please try another file.", () => apply(asset));
        },
        [apply, run],
    );

    const toggleBackground = () =>
        run("Removing background...", "The background could not be changed. Please try again.", async () => {
            if (!hasBackgroundRemoved) await handle.removeBackgroundFromImage();
            else await handle.setUseOriginalImage(!useOriginal);
        });

    const optimise = () =>
        run("Optimising...", "The image could not be optimised. Please try again.", async () => {
            await handle.vectorizeImage();
        });

    const changeColor = useCallback(
        (key: string, fill: string, pmsValue?: string) => {
            const next = { ...colors, [key]: { browserValue: fill, pmsValue } };
            setColors(next);
            handle
                .changeColors(next)
                .then(() => handle.getImageWithColors())
                .then((preview) => preview && setPreviewUrl(preview))
                .catch((colorError) => console.error("Error changing colors:", colorError));
        },
        [colors, handle],
    );

    const isRaster = image?.type === AssetType.Image;
    const backgroundRemoved = hasBackgroundRemoved && !useOriginal;
    // Optimising starts again from the original image, so it can't keep a removed background.
    const showOptimise = hasImage && canManipulate && isRaster && !optimised && !backgroundRemoved;
    const showBackground = hasImage && canManipulate && isRaster && !optimised;
    const showColors = hasImage && handle.isColorPickerEnabled() && !!colors;

    return (
        <Body>
            {mobileSession ? (
                <MobileUploadQR
                    session={mobileSession}
                    onCancel={() => setMobileSession(undefined)}
                    onUploadComplete={finishMobileUpload}
                />
            ) : (
                <>
                    {previewUrl && <Thumbnail src={previewUrl} alt={handle.getTitle()} />}
                    <Actions>
                        {enableLocalUpload && (
                            <>
                                <HiddenInput
                                    ref={inputRef}
                                    type="file"
                                    accept={extensions.join(",")}
                                    disabled={!!busy}
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        // Allows the same file to be chosen again later.
                                        event.target.value = "";
                                        if (file) void upload(file);
                                    }}
                                />
                                <Button
                                    fullWidth
                                    disabled={!!busy}
                                    onClick={() => inputRef.current?.click()}
                                    icon={
                                        busy ? undefined : hasImage ? (
                                            <Replace size={18} aria-hidden="true" />
                                        ) : (
                                            <Upload size={18} aria-hidden="true" />
                                        )
                                    }
                                >
                                    {busy ?? (hasImage ? "Replace Image" : "Upload Image")}
                                </Button>
                            </>
                        )}
                        {enableMobileUpload && (
                            <Button
                                fullWidth
                                disabled={!!busy}
                                icon={<Smartphone size={18} aria-hidden="true" />}
                                onClick={startMobileUpload}
                            >
                                Upload from your mobile
                            </Button>
                        )}
                        {showBackground && (
                            <Button
                                fullWidth
                                disabled={!!busy}
                                icon={
                                    backgroundRemoved ? (
                                        <Undo2 size={18} aria-hidden="true" />
                                    ) : (
                                        <Eraser size={18} aria-hidden="true" />
                                    )
                                }
                                onClick={toggleBackground}
                            >
                                {backgroundRemoved ? "Use Original Image" : "Remove Background"}
                            </Button>
                        )}
                        {showOptimise && (
                            <Button
                                fullWidth
                                disabled={!!busy}
                                icon={<Sparkles size={18} aria-hidden="true" />}
                                onClick={optimise}
                            >
                                Optimize image
                            </Button>
                        )}
                    </Actions>
                    {progress !== undefined && (
                        <ProgressBar>
                            <ProgressFill $progress={progress} />
                        </ProgressBar>
                    )}
                    {!hasImage && enableLocalUpload && (
                        <Help>
                            Accepted types: {extensions.map((extension) => extension.slice(1).toUpperCase()).join(", ")}
                        </Help>
                    )}
                    {showColors && colors && (
                        <Editor>
                            <SVGColorSelector
                                key={image?.key ?? ""}
                                availableColors={[...originalColors, ...colorOptions(handle)]}
                                existingColors={colors}
                                onChange={changeColor}
                                showPms={handle.isPmsPickerEnabled()}
                                showEyeDropper
                                showUndoRedo
                                showColorName={!optimised}
                                showAutoDetected={optimised}
                                currentAsset={image}
                            />
                        </Editor>
                    )}
                </>
            )}
            {error && <ErrorText role="alert">{error}</ErrorText>}
        </Body>
    );
};

/** The colors the property offers to replace the image's with. */
const colorOptions = (handle: FileUploadGlobalPropertyHandle): ReplacementColor[] =>
    handle.getAvailableColors().map((color) => ({
        ...color,
        variant: color.variant ?? { name: "", priceModifier: 0, enabled: true },
    }));

export default FileUploadProperty;
