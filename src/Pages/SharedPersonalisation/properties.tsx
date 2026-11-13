import { ChangeEvent, FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Asset,
    AssetType,
    ColorOptionGlobalPropertyHandle,
    FileUploadGlobalPropertyHandle,
    GlobalPropertyHandle,
    MobileUploadSession,
    OptionGlobalPropertyHandle,
    TextGlobalPropertyHandle,
    Variant,
    assetService,
} from "@spiffcommerce/core";
import { Replace, Smartphone, Upload } from "lucide-react";
import styled from "styled-components";
import Button from "../../components/button";
import Typography from "../../components/typography";
import useDebounce from "../../hooks/useDebounce";
import useTheme from "../../hooks/useTheme";
import useThemeConfiguration from "../../hooks/useThemeConfiguration";
import MobileUploadQR from "../Customization/components/MobileUploadQR";
import VariantGallery from "../Customization/components/VariantGallery";
import { isCustomColor } from "../Customization/components/customColor";

const DEFAULT_EXTENSIONS = [".jpg", ".jpeg", ".png", ".svg", ".pdf", ".eps", ".ai"];
const VECTOR_MIME_TYPES = ["image/svg+xml", "application/pdf", "application/postscript"];
const TEXT_DEBOUNCE_MS = 400;

const Body = styled.div`
    margin-top: 8px;
`;

const TextField = styled.input`
    width: 100%;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 16px;
    font-family: inherit;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: var(--theme-primary-color);
    }
`;

const ColorInput = styled.input`
    width: 100%;
    height: 44px;
    margin-top: 12px;
    padding: 0;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: none;
    cursor: pointer;
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

const TextProperty: FunctionComponent<{ handle: TextGlobalPropertyHandle }> = ({ handle }) => {
    const [text, setText] = useState(() => handle.getText());
    const debounced = useDebounce(text, TEXT_DEBOUNCE_MS);
    useEffect(() => {
        if (debounced === handle.getText()) return;
        handle.setText(debounced).catch((error) => console.error("Error setting shared text:", error));
    }, [debounced, handle]);

    return (
        <Body>
            <TextField
                type="text"
                value={text}
                aria-label={handle.getTitle()}
                onChange={(event) => setText(event.target.value)}
            />
        </Body>
    );
};

const OptionProperty: FunctionComponent<{ handle: OptionGlobalPropertyHandle }> = ({ handle }) => {
    const [variants, setVariants] = useState<Variant[] | undefined>(undefined);
    const [selected, setSelected] = useState<Variant | undefined>(() => handle.getCurrentVariant());
    const [updating, setUpdating] = useState(false);
    const [customColor, setCustomColor] = useState(() =>
        handle instanceof ColorOptionGlobalPropertyHandle ? handle.getCustomColor() : "",
    );

    useEffect(() => {
        let cancelled = false;
        handle
            .getAvailableVariants()
            .then((available) => !cancelled && setVariants(available))
            .catch((error) => {
                console.error("Error loading shared options:", error);
                if (!cancelled) setVariants([]);
            });
        return () => {
            cancelled = true;
        };
    }, [handle]);

    const select = useCallback(
        async (variant: Variant) => {
            if (updating) return;
            setSelected(variant);
            setUpdating(true);
            try {
                await handle.selectVariant(variant);
                setSelected(handle.getCurrentVariant());
            } catch (error) {
                console.error("Error selecting a shared option:", error);
                setSelected(handle.getCurrentVariant());
            } finally {
                setUpdating(false);
            }
        },
        [handle, updating],
    );

    const changeCustomColor = (event: ChangeEvent<HTMLInputElement>) => {
        if (!(handle instanceof ColorOptionGlobalPropertyHandle)) return;
        setCustomColor(event.target.value);
        handle.setCustomColor(event.target.value).catch((error) => console.error("Error setting the color:", error));
    };

    if (!variants) return <Body>Loading...</Body>;
    if (variants.length === 0) return null;
    return (
        <Body>
            <VariantGallery
                variants={variants}
                selectedVariantId={selected?.getId()}
                disabled={updating}
                searchEnabled
                categoriesEnabled
                onSelect={select}
            />
            {handle instanceof ColorOptionGlobalPropertyHandle && isCustomColor(selected?.getColor()) && (
                <ColorInput type="color" value={customColor} onChange={changeCustomColor} />
            )}
        </Body>
    );
};

const FileUploadProperty: FunctionComponent<{ handle: FileUploadGlobalPropertyHandle }> = ({ handle }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const theme = useTheme();
    const { enableMobileUpload: mobileUploadSetting, enableLocalUpload: localUploadSetting } = useThemeConfiguration();
    // Local upload is on unless it has been explicitly turned off, and mobile upload then always is.
    const enableLocalUpload = localUploadSetting !== false;
    const enableMobileUpload = !!mobileUploadSetting || !enableLocalUpload;
    const [image, setImage] = useState<Asset | undefined>(undefined);
    const [hasImage, setHasImage] = useState(() => handle.hasImage());
    const [busy, setBusy] = useState<string | undefined>(undefined);
    const [progress, setProgress] = useState<number | undefined>(undefined);
    const [error, setError] = useState("");
    const [mobileSession, setMobileSession] = useState<MobileUploadSession | undefined>(undefined);
    const extensions = DEFAULT_EXTENSIONS;

    useEffect(() => {
        let cancelled = false;
        handle
            .getImage()
            .then((asset) => !cancelled && setImage(asset))
            .catch((loadError) => console.error("Error loading the shared image:", loadError));
        return () => {
            cancelled = true;
        };
    }, [handle, hasImage]);

    const apply = useCallback(
        async (asset: Asset) => {
            await handle.selectImage(asset);
            setImage(asset);
            setHasImage(true);
        },
        [handle],
    );

    const upload = useCallback(
        async (file: File) => {
            const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
            if (!extensions.includes(extension)) {
                setError(`Unsupported file type. Accepted types: ${extensions.join(", ")}`);
                return;
            }
            setError("");
            setProgress(0);
            setBusy("Uploading...");
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
                setBusy("Applying...");
                await apply(asset);
            } catch (uploadError) {
                console.error("Error uploading a shared image:", uploadError);
                setError("The image could not be uploaded or applied. Please try another file.");
            } finally {
                setProgress(undefined);
                setBusy(undefined);
            }
        },
        [apply, extensions],
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
        async (asset: Asset) => {
            setMobileSession(undefined);
            setBusy("Applying...");
            try {
                await apply(asset);
            } catch (applyError) {
                console.error("Error applying a mobile upload:", applyError);
                setError("The image could not be applied. Please try another file.");
            } finally {
                setBusy(undefined);
            }
        },
        [apply],
    );

    const imageUrl = image?.fileLink;
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
                    {imageUrl && <Thumbnail src={imageUrl} alt={handle.getTitle()} />}
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
                </>
            )}
            {error && <ErrorText role="alert">{error}</ErrorText>}
        </Body>
    );
};

/** The control for a global property, chosen by the kind of property it is. */
export const PropertyControl: FunctionComponent<{ handle: GlobalPropertyHandle }> = ({ handle }) => {
    return useMemo(() => {
        if (handle instanceof TextGlobalPropertyHandle) return <TextProperty handle={handle} />;
        if (handle instanceof FileUploadGlobalPropertyHandle) return <FileUploadProperty handle={handle} />;
        if (handle instanceof OptionGlobalPropertyHandle) return <OptionProperty handle={handle} />;
        return null;
    }, [handle]);
};
