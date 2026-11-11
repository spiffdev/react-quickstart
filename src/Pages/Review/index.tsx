import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { MEDIA } from "../../layout";
import styled, { keyframes } from "styled-components";
import { FileText, ShoppingCart } from "lucide-react";
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

    @media ${MEDIA.compact} {
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

const shimmer = keyframes`
    from {
        background-position: 100% 0;
    }
    to {
        background-position: -100% 0;
    }
`;

// Holds the image's place (the preview is square) while it's being rendered.
const PreviewSkeleton = styled.div`
    flex: 1 1 0;
    min-width: 0;
    max-height: 480px;
    aspect-ratio: 1;
    align-self: flex-start;
    border-radius: 8px;
    background: linear-gradient(90deg, #eeeeee 25%, #f7f7f7 50%, #eeeeee 75%) 100% 0 / 200% 100%;
    animation: ${shimmer} 1.4s linear infinite;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }

    @media ${MEDIA.compact} {
        flex: none;
        width: 100%;
    }
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

const QuoteButton = styled(Button)`
    margin-top: 12px;
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
    allowCart?: boolean;
    allowQuote?: boolean;
    /** Resolves false when the customer backs out of the quote, so they can carry on. */
    onRequestQuote?: () => void | boolean | Promise<void | boolean>;
}> = ({
    workflowExperience,
    exportedData,
    selectionCost,
    onConfirm,
    confirmLabel,
    allowCart = true,
    allowQuote = false,
    onRequestQuote,
}) => {
    const currencyFormatter = useCurrency();
    const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
    // The image may fail to render, in which case the summary is shown without it.
    const [previewFailed, setPreviewFailed] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [quoting, setQuoting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        setPreviewUrl(undefined);
        setPreviewFailed(false);
        withScreenshotPreview(workflowExperience, () =>
            createDesignPreviewImage(workflowExperience, PREVIEW_RESOLUTION),
        )
            .then((url) => {
                if (cancelled) return;
                // An empty image counts as a failure, so the skeleton doesn't stay up for good.
                if (url) setPreviewUrl(url);
                else setPreviewFailed(true);
            })
            .catch((e) => {
                console.error("Error creating the review preview:", e);
                if (!cancelled) setPreviewFailed(true);
            });
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

    // Confirming the quote's details happens in a dialog opened by `onRequestQuote`.
    const handleQuote = useCallback(async () => {
        setError("");
        setConfirming(true);
        setQuoting(true);
        try {
            if ((await onRequestQuote?.()) === false) {
                setConfirming(false);
                setQuoting(false);
            }
        } catch (e) {
            console.error("Error requesting a quote:", e);
            setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
            setConfirming(false);
            setQuoting(false);
        }
    }, [onRequestQuote]);

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
                {previewUrl ? (
                    <PreviewImage src={previewUrl} alt="Preview of your design" />
                ) : (
                    !previewFailed && <PreviewSkeleton role="status" aria-label="Loading preview of your design" />
                )}
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
                    {allowCart && (
                        <Button
                            fullWidth
                            disabled={confirming || !exportedData}
                            icon={confirming && !quoting ? undefined : <ShoppingCart size={18} aria-hidden="true" />}
                            onClick={handleConfirm}
                        >
                            {confirming && !quoting ? "Please wait..." : confirmLabel || "Complete Design"}
                        </Button>
                    )}
                    {allowQuote && (
                        <QuoteButton
                            fullWidth
                            disabled={confirming || !exportedData}
                            icon={<FileText size={18} aria-hidden="true" />}
                            onClick={handleQuote}
                        >
                            Request a Quote
                        </QuoteButton>
                    )}
                    {error && <ErrorText role="alert">{error}</ErrorText>}
                </Summary>
            </Content>
        </Page>
    );
};

export default ReviewPage;
