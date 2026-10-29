import { ChangeEvent, FunctionComponent, useCallback, useRef, useState } from "react";
import { assetService, AssetType, DigitalContentStepHandle, WorkflowManager } from "@spiffcommerce/core";
import styled from "styled-components";
import Button from "../../../components/button";
import Typography from "../../../components/typography";

const MAX_UPLOAD_SIZE_IN_MB = 100;
const ACCEPTED_EXTENSIONS = ".mp4, .m4v, .mov, .avi, .wmv, .mkv, .webm";

const Container = styled.div`
    padding: 16px;
    box-sizing: border-box;
    width: 100%;
`;

const ProgressBar = styled.div`
    width: 100%;
    height: 8px;
    background-color: #e0e0e0;
    border-radius: 4px;
    margin-top: 16px;
    overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number }>`
    height: 100%;
    width: ${(props) => props.$progress}%;
    background-color: var(--theme-primary-color);
    transition: width 0.3s;
`;

const PreviewSection = styled.div`
    margin-top: 16px;
    text-align: center;
`;

const Message = styled(Typography)<{ $error?: boolean }>`
    margin: 12px 0;
    color: ${(props) => (props.$error ? "#d32f2f" : "#666")};
    font-size: 14px;
`;

const HiddenInput = styled.input`
    display: none;
`;

const DigitalContentUI: FunctionComponent<{
    step: DigitalContentStepHandle;
    workflowManager: WorkflowManager;
    onActivation?: () => void;
}> = ({ step, workflowManager, onActivation }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState(() => step.getPreviewURL());
    const [error, setError] = useState("");

    const handleFileSelect = useCallback(
        async (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            // Allow selecting the same file again later.
            event.target.value = "";
            if (!file) return;

            if (file.size > MAX_UPLOAD_SIZE_IN_MB * 1000000) {
                setError(`Video file is too large (max ${MAX_UPLOAD_SIZE_IN_MB}MB)`);
                return;
            }

            setError("");
            setUploadProgress(0);
            setUploading(true);
            workflowManager.setMandatoryFulfilled(step.getId(), false);

            try {
                const asset = await assetService.uploadAssetWithProgress(
                    { name: file.name, blob: new Blob([file], { type: file.type }) },
                    AssetType.Video,
                    (value) => setUploadProgress(Math.max(0, Math.min(value, 100))),
                    true,
                );
                onActivation?.();
                setPreviewUrl(await step.selectVideo(asset));
                workflowManager.setMandatoryFulfilled(step.getId(), true);
            } catch (uploadError) {
                console.error("Error uploading video:", uploadError);
                setError("The video could not be uploaded. Please try again.");
            } finally {
                setUploading(false);
            }
        },
        [onActivation, step, workflowManager],
    );

    return (
        <Container data-test-step-type="digital-content">
            <HiddenInput
                ref={inputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFileSelect}
                disabled={uploading}
            />
            <Button onClick={() => inputRef.current?.click()} disabled={uploading} fullWidth>
                {uploading ? "Uploading..." : "Choose Video"}
            </Button>
            {error && (
                <Message variant="p" $error>
                    {error}
                </Message>
            )}
            {uploading && (
                <ProgressBar>
                    <ProgressFill $progress={uploadProgress} />
                </ProgressBar>
            )}
            {previewUrl && !uploading && (
                <PreviewSection>
                    <Message variant="p">Preview ready</Message>
                    <Button onClick={() => window.open(previewUrl, "_blank")}>Preview Video</Button>
                </PreviewSection>
            )}
        </Container>
    );
};

export default DigitalContentUI;
