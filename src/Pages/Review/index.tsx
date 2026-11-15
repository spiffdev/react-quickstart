import { FunctionComponent, useCallback, useEffect, useMemo, useState } from "react";
import { MEDIA } from "../../layout";
import styled from "styled-components";
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

const Items = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 16px;
`;

const ItemCard = styled.article`
    display: flex;
    gap: 24px;
    padding: 16px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #fff;

    @media ${MEDIA.compact} {
        flex-direction: column;
        gap: 12px;
    }
`;

// Holds the preview's place (it is square) from the start, so the layout doesn't move when the image arrives.
const PreviewFrame = styled.div`
    position: relative;
    flex: none;
    width: 160px;
    height: 160px;
    align-self: flex-start;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #fff;
    overflow: hidden;

    @media ${MEDIA.compact} {
        width: 100%;
        height: auto;
        aspect-ratio: 1;
        max-height: 280px;
    }
`;

const PreviewImage = styled.img`
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
`;

// Covers the frame while the preview is made and loaded, then fades out to reveal the image.
const PreviewOverlay = styled.div<{ $visible: boolean }>`
    position: absolute;
    inset: 0;
    background-color: #d4d4d4;
    opacity: ${(props) => (props.$visible ? 1 : 0)};
    pointer-events: none;
    transition: opacity 0.3s ease;

    @media (prefers-reduced-motion: reduce) {
        transition: none;
    }
`;

const ItemDetails = styled.div`
    flex: 1 1 0;
    min-width: 0;
`;

const ItemHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 8px;
`;

const ItemName = styled(Typography)`
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    overflow-wrap: anywhere;
`;

const Quantity = styled.span`
    margin-left: 8px;
    font-size: 14px;
    font-weight: 400;
    color: #666;
`;

const Prices = styled.div`
    flex: none;
    display: flex;
    gap: 8px;
    font-weight: 600;
`;

const OriginalPrice = styled.span`
    font-weight: 400;
    color: #666;
    text-decoration: line-through;
`;

const Summary = styled.div`
    max-width: 960px;
    margin: 0 auto;
`;

const Heading = styled(Typography)`
    margin: 0 0 16px 0;
    font-size: 24px;
    font-weight: 600;
`;

const Rows = styled.div`
    background: #f5f5f5;
    border-radius: 8px;
    padding: 4px 16px;
`;

const Row = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
    border-bottom: 1px solid #e0e0e0;
    font-size: 14px;
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

// The products which were added to the item, which are part of it rather than items of their own.
const Included = styled.div`
    margin-top: 12px;
`;

const IncludedHeading = styled(Typography)`
    margin: 0 0 4px 0;
    font-size: 13px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.04em;
`;

const IncludedItem = styled.div`
    padding: 8px 0 0 12px;
    border-left: 3px solid #e0e0e0;
    margin-bottom: 8px;
`;

const IncludedTitle = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 14px;
    font-weight: 600;
`;

const Totals = styled.div`
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
    padding: 12px 16px;
    border-radius: 8px;
    background: #f5f5f5;
    font-size: 18px;
    font-weight: 700;
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

type ItemDetailsData = ExportedStepData[];

// Previews share one 3D scene, so they have to be made one at a time.
let previewQueue: Promise<unknown> = Promise.resolve();
const enqueuePreview = <T,>(task: () => Promise<T>): Promise<T> => {
    const result = previewQueue.then(task, task);
    previewQueue = result.catch(() => undefined);
    return result;
};

const experienceId = (experience: WorkflowExperience) => experience.getTransaction().id;
const parentOf = (experience: WorkflowExperience) => experience.getTransaction().parentTransaction?.id;
const nameOf = (experience: WorkflowExperience) =>
    experience.getTransaction().designName || experience.getProduct()?.name || "Product";

/** The price of an experience for its whole quantity, and what it would be without a price break. */
const linePrice = (experience: WorkflowExperience) => {
    const quantity = experience.getQuantity();
    const price = experience.getTotalPriceSubunits() * quantity;
    const original = experience.priceBreakToBeApplied() < 1 ? experience.getTotalPriceSubunits(true) * quantity : price;
    return { price, original };
};

// An unset (null) flag counts as enabled; only an explicit false hides pricing.
const pricingShown = (experience: WorkflowExperience) => experience.getWorkflow()?.showPricing !== false;

const StepRows: FunctionComponent<{
    data: ItemDetailsData;
    formatPrice: ((amount: number) => string) | undefined;
}> = ({ data, formatPrice }) => (
    <Rows>
        {data.flatMap((step) =>
            step.properties.map((property, index) => (
                <Row key={`${step.stepId}-${index}`}>
                    <Typography variant="span">{index === 0 ? step.title : ""}</Typography>
                    <RowValue>
                        <Typography variant="span">{formatValue(property.value)}</Typography>
                        {formatPrice && property.priceModifier > 0 && (
                            <Typography variant="span">{formatPrice(property.priceModifier)}</Typography>
                        )}
                    </RowValue>
                </Row>
            )),
        )}
    </Rows>
);

const PriceLine: FunctionComponent<{
    experience: WorkflowExperience;
    formatPrice: ((amount: number) => string) | undefined;
}> = ({ experience, formatPrice }) => {
    const { price, original } = linePrice(experience);
    if (!formatPrice || !pricingShown(experience) || price <= 0) return null;
    return (
        <Prices>
            {original > price && <OriginalPrice>{formatPrice(original)}</OriginalPrice>}
            <span>{formatPrice(price)}</span>
        </Prices>
    );
};

const ReviewItem: FunctionComponent<{
    experience: WorkflowExperience;
    included: WorkflowExperience[];
    details: Map<string, ItemDetailsData>;
    formatPrice: ((amount: number) => string) | undefined;
}> = ({ experience, included, details, formatPrice }) => {
    const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
    // The image may fail to render, in which case the item is shown without it.
    const [previewFailed, setPreviewFailed] = useState(false);
    // The image has been fetched and drawn, as opposed to merely having been made.
    const [previewLoaded, setPreviewLoaded] = useState(false);

    useEffect(() => {
        let canceled = false;
        setPreviewUrl(undefined);
        setPreviewFailed(false);
        setPreviewLoaded(false);
        enqueuePreview(async () => {
            // The customer may have left by the time it's this item's turn.
            if (canceled) return undefined;
            return withScreenshotPreview(experience, () => createDesignPreviewImage(experience, PREVIEW_RESOLUTION));
        })
            .then((url) => {
                if (canceled) return;
                // An empty image counts as a failure, so the skeleton doesn't stay up for good.
                if (url) setPreviewUrl(url);
                else setPreviewFailed(true);
            })
            .catch((e) => {
                console.error("Error creating the review preview:", e);
                if (!canceled) setPreviewFailed(true);
            });
        return () => {
            canceled = true;
        };
    }, [experience]);

    const quantity = experience.getQuantity();
    const own = pricingShown(experience) ? formatPrice : undefined;
    return (
        <ItemCard>
            {!previewFailed && (
                <PreviewFrame>
                    {previewUrl && (
                        <PreviewImage
                            src={previewUrl}
                            alt={`Preview of ${nameOf(experience)}`}
                            onLoad={() => setPreviewLoaded(true)}
                            // An image which can't be shown shouldn't leave the overlay up for good.
                            onError={() => setPreviewFailed(true)}
                        />
                    )}
                    <PreviewOverlay
                        $visible={!previewLoaded}
                        role={previewLoaded ? undefined : "status"}
                        aria-label={previewLoaded ? undefined : `Loading preview of ${nameOf(experience)}`}
                        aria-hidden={previewLoaded || undefined}
                    />
                </PreviewFrame>
            )}
            <ItemDetails>
                <ItemHeader>
                    <ItemName variant="h3">
                        {nameOf(experience)}
                        {quantity > 1 && <Quantity>× {quantity}</Quantity>}
                    </ItemName>
                    <PriceLine experience={experience} formatPrice={formatPrice} />
                </ItemHeader>
                {(details.get(experienceId(experience))?.length ?? 0) > 0 && (
                    <StepRows data={details.get(experienceId(experience))!} formatPrice={own} />
                )}
                {included.length > 0 && (
                    <Included>
                        <IncludedHeading variant="h3">Includes</IncludedHeading>
                        {included.map((child) => {
                            const childData = details.get(experienceId(child)) ?? [];
                            return (
                                <IncludedItem key={experienceId(child)}>
                                    <IncludedTitle>
                                        <span>
                                            {nameOf(child)}
                                            {child.getQuantity() > 1 && <Quantity>× {child.getQuantity()}</Quantity>}
                                        </span>
                                        <PriceLine experience={child} formatPrice={formatPrice} />
                                    </IncludedTitle>
                                    {childData.length > 0 && (
                                        <StepRows
                                            data={childData}
                                            formatPrice={pricingShown(child) ? formatPrice : undefined}
                                        />
                                    )}
                                </IncludedItem>
                            );
                        })}
                    </Included>
                )}
            </ItemDetails>
        </ItemCard>
    );
};

/**
 * A summary of everything in the cart, shown before the customer completes their order. Each item has its own row;
 * the products added to an item are listed within it.
 */
const ReviewPage: FunctionComponent<{
    /** Every experience in the bundle, including the products added to others. */
    experiences: WorkflowExperience[];
    /** Completes the design. Rejects with a customer-readable message when that fails. */
    onConfirm: () => Promise<void>;
    confirmLabel?: string;
    allowCart?: boolean;
    allowQuote?: boolean;
    /** Resolves false when the customer backs out of the quote, so they can carry on. */
    onRequestQuote?: () => void | boolean | Promise<void | boolean>;
}> = ({ experiences, onConfirm, confirmLabel, allowCart = true, allowQuote = false, onRequestQuote }) => {
    const currencyFormatter = useCurrency();
    const [details, setDetails] = useState<Map<string, ItemDetailsData> | undefined>(undefined);
    const [confirming, setConfirming] = useState(false);
    const [quoting, setQuoting] = useState(false);
    const [error, setError] = useState("");

    // A product whose parent is missing has nowhere to sit, so it gets a row of its own.
    const { items, childrenOf } = useMemo(() => {
        const ids = new Set(experiences.map(experienceId));
        const isChild = (experience: WorkflowExperience) => {
            const parent = parentOf(experience);
            return !!parent && ids.has(parent);
        };
        return {
            items: experiences.filter((experience) => !isChild(experience)),
            childrenOf: (parent: WorkflowExperience) =>
                experiences.filter(
                    (experience) => isChild(experience) && parentOf(experience) === experienceId(parent),
                ),
        };
    }, [experiences]);

    useEffect(() => {
        let canceled = false;
        setDetails(undefined);
        Promise.all(
            experiences.map(async (experience): Promise<[string, ItemDetailsData]> => {
                try {
                    return [experienceId(experience), await experience.getExportedStepData()];
                } catch (e) {
                    console.error("Error loading the details of a design:", e);
                    return [experienceId(experience), []];
                }
            }),
        ).then((entries) => !canceled && setDetails(new Map(entries)));
        return () => {
            canceled = true;
        };
    }, [experiences]);

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

    // The total includes the added products, which are charged as well. It's only shown when every price is, as a
    // total which left out the hidden ones would be misleading.
    const total = experiences.reduce((sum, experience) => sum + linePrice(experience).price, 0);
    const showTotal = !!currencyFormatter && total > 0 && experiences.every(pricingShown);
    const ready = !!details;

    return (
        <Page>
            <Summary>
                <Heading variant="h2">Review Your Order</Heading>
                <Items>
                    {items.map((experience) => (
                        <ReviewItem
                            key={experienceId(experience)}
                            experience={experience}
                            included={childrenOf(experience)}
                            details={details ?? new Map()}
                            formatPrice={currencyFormatter}
                        />
                    ))}
                </Items>
                {showTotal && (
                    <Totals>
                        <Typography variant="span">Total</Typography>
                        <Typography variant="span">{currencyFormatter(total)}</Typography>
                    </Totals>
                )}
                {allowCart && (
                    <Button
                        fullWidth
                        disabled={confirming || !ready}
                        icon={confirming && !quoting ? undefined : <ShoppingCart size={18} aria-hidden="true" />}
                        onClick={handleConfirm}
                    >
                        {confirming && !quoting ? "Please wait..." : confirmLabel || "Complete Design"}
                    </Button>
                )}
                {allowQuote && (
                    <QuoteButton
                        fullWidth
                        disabled={confirming || !ready}
                        icon={<FileText size={18} aria-hidden="true" />}
                        onClick={handleQuote}
                    >
                        Request a Quote
                    </QuoteButton>
                )}
                {error && <ErrorText role="alert">{error}</ErrorText>}
            </Summary>
        </Page>
    );
};

export default ReviewPage;
