import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { Step, AnyStepData, WorkflowExperience } from "@spiffcommerce/core";
import styled from "styled-components";
import Button from "../../../components/button";
import Typography from "../../../components/typography";

const Container = styled.div`
    padding: 16px;
    box-sizing: border-box;
    width: 100%;
    overflow: hidden;
`;

// Unused styled component - reserved for future use
// const UploadSection = styled.div`
//     border: 2px dashed #ccc;
//     border-radius: 8px;
//     padding: 32px;
//     text-align: center;
//     cursor: pointer;
//     margin-bottom: 16px;
//     transition: all 0.2s;

//     &:hover {
//         border-color: #007bff;
//         background-color: #f5f5f5;
//     }
// `;

const UploadText = styled(Typography)`
    margin: 8px 0;
    color: #666;
`;

const VariantGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    width: 100%;
    margin-bottom: 16px;
`;

const VariantCard = styled.div<{ selected?: boolean }>`
    position: relative;
    aspect-ratio: 1;
    border: 2px solid ${(props) => (props.selected ? "#007bff" : "#e0e0e0")};
    border-radius: 8px;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.2s;

    &:hover {
        border-color: #007bff;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
`;

const VariantImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

const HiddenInput = styled.input`
    display: none;
`;

const ColorSection = styled.div`
    margin-top: 16px;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 8px;
`;

const ColorTitle = styled(Typography)`
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
`;

interface Variant {
    id: string;
    name: string;
    thumbnail?: string;
}

const FrameUI: FunctionComponent<{
    step: Step<AnyStepData>;
    workflowExperience: WorkflowExperience;
    onActivation?: () => void;
}> = ({ step, onActivation }) => {
    const [variants] = useState<Variant[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [hasColorPicker] = useState(false);

    useEffect(() => {
        // TODO: Load variants from step when API is available
    }, [step]);

    const handleFileSelect = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            if (!file.type.startsWith("image/")) {
                return;
            }

            setUploading(true);
            onActivation?.();

            // TODO: Implement actual image upload logic
            setTimeout(() => {
                setUploading(false);
            }, 1000);
        },
        [onActivation],
    );

    const handleUploadClick = useCallback(() => {
        document.getElementById("frame-upload-input")?.click();
    }, []);

    const handleVariantClick = useCallback(
        (variantId: string) => {
            setSelectedVariantId(variantId);
            onActivation?.();
            // TODO: Implement variant selection logic
        },
        [onActivation],
    );

    return (
        <Container data-test-step-type="frame">
            <HiddenInput
                id="frame-upload-input"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
            />
            <Button onClick={handleUploadClick} disabled={uploading} fullWidth>
                {uploading ? "Uploading..." : "Upload Image"}
            </Button>
            {variants.length > 0 && (
                <>
                    <UploadText variant="p">Or choose from templates:</UploadText>
                    <VariantGrid>
                        {variants.map((variant) => (
                            <VariantCard
                                key={variant.id}
                                selected={selectedVariantId === variant.id}
                                onClick={() => handleVariantClick(variant.id)}
                            >
                                {variant.thumbnail && <VariantImage src={variant.thumbnail} alt={variant.name} />}
                            </VariantCard>
                        ))}
                    </VariantGrid>
                </>
            )}
            {hasColorPicker && (
                <ColorSection>
                    <ColorTitle variant="h3">Color Options</ColorTitle>
                    {/* TODO: Implement SVG color picker */}
                </ColorSection>
            )}
        </Container>
    );
};

export default FrameUI;
