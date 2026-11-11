import { FunctionComponent, useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { ShoppingCart } from "lucide-react";
import { ExportedStepData, WorkflowExperience } from "@spiffcommerce/core";
import Button from "../../components/button";
import Typography from "../../components/typography";
import { createDesignPreviewImage, withScreenshotPreview } from "../Customization/previewScreenshot";
import useCurrency from "../../hooks/useCurrency";

const PREVIEW_RESOLUTION = 512;

const Page = styled.div`
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
    padding: 24px 16px;
    background-color: var(--theme-background-color, #fff);
`;

const Content = styled.div`
    display: flex;
    gap: 32px;
    max-width: 960px;
    margin: 0 auto;

    @media (max-width: 768px) {
        flex-direction: column;
        gap: 16px;
    }
`;

const PreviewImage = styled.img`
    flex: 1 1 0;
    min-width: 0;
    max-height: 480px;
    object-fit: contain;
    align-self: flex-start;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #fff;
`;

const Summary = styled.div`
    flex: 1 1 0;
    min-width: 0;
`;

const Heading = styled(Typography)`
    margin: 0 0 16px 0;
    font-size: 24px;
    font-weight: 600;
`;

const Rows = styled.div`
    background: #f5f5f5;
    border-radius: 8px;
    padding: 8px 16px;
    margin-bottom: 16px;
`;

const Row = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid #e0e0e0;
    overflow-wrap: anywhere;

    &:last-child {
        border-bottom: none;
    }
`;

const RowValue = styled.div`
    display: flex;
    gap: 12px;
    text-align: right;
`;

const ErrorText = styled(Typography)`
    margin: 12px 0 0 0;
    font-size: 13px;
    color: #d32f2f;
`;

const formatValue = (value: string) =>
    value.startsWith("http") ? (
        <a href={value} target="_blank" rel="noopener noreferrer">
            Link
        </a>
    ) : (
        value
    );

/**
 * A summary of the design, shown before the customer completes it.
 */
const ReviewPage: FunctionComponent<{
    workflowExperience: WorkflowExperience;
    /** Undefined until the design's details have loaded. */
    exportedData: ExportedStepData[] | undefined;
    selectionCost: number;
    /** Completes the design. Rejects with a customer-readable message when that fails. */
    onConfirm: () => Promise<void>;
    confirmLabel?: string;
}> = ({ workflowExperience, exportedData, selectionCost, onConfirm, confirmLabel }) => {
    const currencyFormatter = useCurrency();
    const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
    const [confirming, setConfirming] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        setPreviewUrl(undefined);
        withScreenshotPreview(workflowExperience, () =>
            createDesignPreviewImage(workflowExperience, PREVIEW_RESOLUTION),
        )
            .then((url) => !cancelled && setPreviewUrl(url))
            // The summary is still useful without an image.
            .catch((e) => console.error("Error creating the review preview:", e));
        return () => {
            cancelled = true;
        };
    }, [workflowExperience]);

    const handleConfirm = useCallback(async () => {
        setError("");
        setConfirming(true);
        try {
            await onConfirm();
        } catch (e) {
            console.error("Error completing the design:", e);
            setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
            setConfirming(false);
        }
    }, [onConfirm]);

    const product = workflowExperience.getProduct();
    const basePrice = product?.basePrice || 0;
    const totalPrice = basePrice + selectionCost;
    const showPricing = workflowExperience.getWorkflow()?.showPricing !== false;
    const formatPrice = showPricing && totalPrice > 0 ? currencyFormatter : undefined;
    const rows = (exportedData ?? []).flatMap((step) =>
        step.properties.map((property, index) => ({
            ...property,
            key: `${step.stepId}-${index}`,
            title: index === 0 ? step.title : "",
        })),
    );

    return (
        <Page>
            <Content>
                {previewUrl && <PreviewImage src={previewUrl} alt="Preview of your design" />}
                <Summary>
                    <Heading variant="h2">{product?.name ? `Review ${product.name}` : "Review Your Design"}</Heading>
                    {(rows.length > 0 || formatPrice) && (
                        <Rows>
                            {rows.map((row) => (
                                <Row key={row.key}>
                                    <Typography variant="span">{row.title}</Typography>
                                    <RowValue>
                                        <Typography variant="span">{formatValue(row.value)}</Typography>
                                        {formatPrice && row.priceModifier > 0 && (
                                            <Typography variant="span">{formatPrice(row.priceModifier)}</Typography>
                                        )}
                                    </RowValue>
                                </Row>
                            ))}
                            {formatPrice && (
                                <>
                                    {basePrice > 0 && (
                                        <Row>
                                            <Typography variant="span">Base Price</Typography>
                                            <Typography variant="span">{formatPrice(basePrice)}</Typography>
                                        </Row>
                                    )}
                                    <Row>
                                        <Typography variant="span" style={{ fontWeight: "bold" }}>
                                            Total
                                        </Typography>
                                        <Typography variant="span" style={{ fontWeight: "bold" }}>
                                            {formatPrice(totalPrice)}
                                        </Typography>
                                    </Row>
                                </>
                            )}
                        </Rows>
                    )}
                    <Button
                        fullWidth
                        disabled={confirming || !exportedData}
                        icon={confirming ? undefined : <ShoppingCart size={18} aria-hidden="true" />}
                        onClick={handleConfirm}
                    >
                        {confirming ? "Please wait..." : confirmLabel || "Complete Design"}
                    </Button>
                    {error && <ErrorText role="alert">{error}</ErrorText>}
                </Summary>
            </Content>
        </Page>
    );
};

export default ReviewPage;
