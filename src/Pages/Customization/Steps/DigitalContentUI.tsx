import { FunctionComponent, useCallback, useState } from "react";
import { DigitalContentStepHandle } from "@spiffcommerce/core";
import styled from "styled-components";
import Button from "../../../components/button";

const Container = styled.div`
    padding: 16px;
`;

// Unused styled components - reserved for future use
// const UploadArea = styled.div`
//     border: 2px dashed #ccc;
//     border-radius: 8px;
//     padding: 32px;
//     text-align: center;
//     cursor: pointer;
//     transition: all 0.2s;

//     &:hover {
//         border-color: #007bff;
//         background-color: #f5f5f5;
//     }
// `;

// const UploadIcon = styled.div`
//     font-size: 48px;
//     margin-bottom: 12px;
// `;

// const UploadText = styled.p`
//     margin: 8px 0;
//     color: #666;
// `;

const ProgressBar = styled.div`
    width: 100%;
    height: 8px;
    background-color: #e0e0e0;
    border-radius: 4px;
    margin-top: 16px;
    overflow: hidden;
`;

const ProgressFill = styled.div<{ progress: number }>`
    height: 100%;
    width: ${(props) => props.progress}%;
    background-color: #007bff;
    transition: width 0.3s;
`;

const PreviewSection = styled.div`
    margin-top: 16px;
    text-align: center;
`;

const Message = styled.p<{ error?: boolean }>`
    margin: 12px 0;
    color: ${(props) => (props.error ? "#d32f2f" : "#666")};
    font-size: 14px;
`;

const HiddenInput = styled.input`
    display: none;
`;

const DigitalContentUI: FunctionComponent<{
    step: DigitalContentStepHandle;
    onActivation?: () => void;
}> = ({ step, onActivation }) => {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState(() => step.getPreviewURL());
    const [error, setError] = useState("");
    const fileInputRef = useCallback((node: HTMLInputElement | null) => {
        if (node) {
            node.value = "";
        }
    }, []);

    const handleFileSelect = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            if (!file.type.startsWith("video/")) {
                setError("Please select a video file");
                return;
            }

            if (file.size > 100 * 1024 * 1024) {
                setError("Video file is too large (max 100MB)");
                return;
            }

            setError("");
            setUploading(true);
            setUploadProgress(0);
            onActivation?.();

            // Simulate upload progress
            const interval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setUploading(false);
                        setPreviewUrl(URL.createObjectURL(file));
                        return 100;
                    }
                    return prev + 10;
                });
            }, 200);

            // TODO: Implement actual video upload logic
        },
        [onActivation],
    );

    const handleUploadClick = useCallback(() => {
        document.getElementById("video-upload-input")?.click();
    }, []);

    const handlePreview = useCallback(() => {
        if (previewUrl) {
            window.open(previewUrl, "_blank");
        }
    }, [previewUrl]);

    return (
        <Container data-test-step-type="digital-content">
            <HiddenInput
                id="video-upload-input"
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                disabled={uploading}
            />
            <Button onClick={handleUploadClick} disabled={uploading} fullWidth>
                {uploading ? "Uploading..." : "Choose Video"}
            </Button>
            {error && <Message error>{error}</Message>}
            {uploading && (
                <ProgressBar>
                    <ProgressFill progress={uploadProgress} />
                </ProgressBar>
            )}
            {uploadProgress === 100 && !previewUrl && <Message>Upload complete, processing...</Message>}
            {previewUrl && (
                <PreviewSection>
                    <Message>Preview ready</Message>
                    <Button onClick={handlePreview}>Preview Video</Button>
                </PreviewSection>
            )}
        </Container>
    );
};

export default DigitalContentUI;
