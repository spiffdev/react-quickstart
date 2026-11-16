import { FunctionComponent, useCallback, useEffect, useRef, useState } from "react";
import { WorkflowExperience } from "@spiffcommerce/core";
import { ChevronDown, ChevronUp, Minus, Plus, Trash2 } from "lucide-react";
import styled from "styled-components";
import { MEDIA } from "../../layout";
import Button from "../../components/button";
import Typography from "../../components/typography";
import useCurrency from "../../hooks/useCurrency";

// Beside the products, the cart lists everything. When stacked below them it shows only the latest design, and can be
// expanded to cover the whole products area.
const Panel = styled.aside<{ $expanded: boolean }>`
    flex: 0 0 320px;
    display: flex;
    flex-direction: column;
    min-height: 0;
    box-sizing: border-box;
    border-left: 1px solid #e0e0e0;
    background-color: #fff;

    @media ${MEDIA.stacked} {
        flex: 0 1 auto;
        border-left: none;
        border-top: 1px solid #e0e0e0;
        ${(props) =>
            props.$expanded &&
            `
            position: absolute;
            inset: 0;
            z-index: 2;
            border-top: none;
        `}
    }
`;

const HeadingRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 16px 16px 8px;

    @media ${MEDIA.stacked} {
        padding: 10px 16px 4px;
    }
`;

const Heading = styled(Typography)`
    margin: 0;
    font-size: 18px;
    font-weight: 600;
`;

// Only needed when stacked, where the rest of the cart is out of sight.
const Count = styled.span`
    display: none;
    margin-left: 6px;
    font-weight: 400;
    color: #666;

    @media ${MEDIA.stacked} {
        display: inline;
    }
`;

const ExpandButton = styled.button`
    display: none;
    align-items: center;
    justify-content: center;
    padding: 6px;
    color: var(--theme-primary-color);
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:focus-visible {
        outline: 2px solid var(--theme-primary-color);
    }

    @media ${MEDIA.stacked} {
        display: inline-flex;
    }
`;

const Lines = styled.ul<{ $expanded: boolean }>`
    flex: 1 1 0;
    min-height: 0;
    margin: 0;
    padding: 0 16px;
    overflow-y: auto;
    list-style: none;

    /* Stacked: only the design added last, until the cart is expanded. */
    @media ${MEDIA.stacked} {
        ${(props) =>
            !props.$expanded &&
            `
            flex: none;
            overflow: visible;

            & > li:not(:last-child) {
                display: none;
            }
        `}
    }
`;

const Line = styled.li`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #eee;
`;

const Thumbnail = styled.img`
    flex: none;
    width: 48px;
    height: 48px;
    object-fit: contain;
`;

const Details = styled.div`
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    font-size: 14px;
`;

const Name = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const Price = styled.span`
    color: #666;
`;

const Stepper = styled.div`
    flex: none;
    display: inline-flex;
    align-items: center;
    border: 1px solid #ccc;
    border-radius: 5px;
`;

// Touch screens give every button a minimum size, so the icon has to be centred in it.
const StepperButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    color: inherit;
    background: none;
    border: none;
    cursor: pointer;

    &:disabled {
        opacity: 0.4;
        cursor: default;
    }
`;

const QuantityInput = styled.input`
    width: 36px;
    padding: 4px 0;
    font: inherit;
    font-size: 14px;
    text-align: center;
    border: none;
    appearance: textfield;
    -moz-appearance: textfield;

    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
        appearance: none;
        margin: 0;
    }
`;

// How long the buttons wait after the last press before the quantity is applied.
const QUANTITY_DEBOUNCE_MS = 500;

/**
 * A quantity which is applied once the customer has stopped changing it: after a pause when using the buttons, and
 * when they finish typing (blur or Enter). The value shown follows the customer's changes straight away.
 */
const QuantityControl: FunctionComponent<{
    name: string;
    quantity: number;
    disabled?: boolean;
    onChange: (quantity: number) => void;
}> = ({ name, quantity, disabled, onChange }) => {
    // What the customer has entered, until it has been applied.
    const [draft, setDraft] = useState<string | undefined>(undefined);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    // The latest props, for the timer and for unmounting, which would otherwise see the ones from when they were set.
    const latest = useRef({ quantity, onChange });
    latest.current = { quantity, onChange };
    const pending = useRef<number | undefined>(undefined);

    const flush = useCallback(() => {
        clearTimeout(timer.current);
        const value = pending.current;
        pending.current = undefined;
        if (value !== undefined && value >= 1 && value !== latest.current.quantity) latest.current.onChange(value);
        else setDraft(undefined);
    }, []);

    // Once the change has been applied (or has failed) the quantity is the source of truth again.
    useEffect(() => {
        if (!disabled && pending.current === undefined) setDraft(undefined);
    }, [disabled]);

    // A change which hasn't been applied yet isn't lost if the cart goes away, e.g. by continuing straight away.
    useEffect(() => flush, [flush]);

    const shown = Math.floor(Number(draft ?? quantity));
    const step = (delta: number) => {
        const next = Math.max(1, shown + delta);
        setDraft(String(next));
        pending.current = next;
        clearTimeout(timer.current);
        timer.current = setTimeout(flush, QUANTITY_DEBOUNCE_MS);
    };

    return (
        <Stepper>
            <StepperButton
                type="button"
                aria-label={`Decrease quantity of ${name}`}
                disabled={disabled || shown <= 1}
                onClick={() => step(-1)}
            >
                <Minus size={14} aria-hidden="true" />
            </StepperButton>
            <QuantityInput
                type="number"
                min={1}
                aria-label={`Quantity of ${name}`}
                disabled={disabled}
                value={draft ?? quantity}
                onChange={(event) => {
                    // Typing is applied when finished, not part way through a number.
                    clearTimeout(timer.current);
                    setDraft(event.target.value);
                    pending.current = Math.floor(Number(event.target.value));
                }}
                onBlur={flush}
                onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
            />
            <StepperButton
                type="button"
                aria-label={`Increase quantity of ${name}`}
                disabled={disabled}
                onClick={() => step(1)}
            >
                <Plus size={14} aria-hidden="true" />
            </StepperButton>
        </Stepper>
    );
};

const RemoveButton = styled.button`
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    color: #666;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:hover:not(:disabled),
    &:focus-visible {
        color: #c0392b;
    }

    &:disabled {
        opacity: 0.5;
        cursor: default;
    }
`;

const Empty = styled(Typography)`
    margin: 0;
    padding: 8px 16px 16px;
    font-size: 14px;
    color: #666;
`;

const Footer = styled.div`
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px calc(16px + env(safe-area-inset-right, 0px)) calc(16px + env(safe-area-inset-bottom, 0px)) 16px;
    border-top: 1px solid #e0e0e0;
`;

const Total = styled.div`
    display: flex;
    justify-content: space-between;
    font-weight: 600;
`;

const experienceId = (experience: WorkflowExperience) => experience.getTransaction().id;

const imageOf = (experience: WorkflowExperience) =>
    [...(experience.getProduct()?.productImages ?? [])].sort((a, b) => (a.precedence ?? 0) - (b.precedence ?? 0))[0]
        ?.asset.fileLink;

/**
 * The designs the customer has chosen so far, shown beside the products they can add to them.
 */
const Cart: FunctionComponent<{
    experiences: WorkflowExperience[];
    onRemove: (experience: WorkflowExperience) => void;
    onQuantityChange: (experience: WorkflowExperience, quantity: number) => void;
    onContinue: () => void;
    /** Disables the controls while the cart is being changed. */
    busy?: boolean;
    /** False while something is still being added, as the cart would be incomplete. */
    canContinue?: boolean;
}> = ({ experiences, onRemove, onQuantityChange, onContinue, busy, canContinue = true }) => {
    const formatPrice = useCurrency();
    const [expanded, setExpanded] = useState(false);
    // With one design there's nothing more to show, so the cart can't stay expanded after others are removed.
    const canExpand = experiences.length > 1;
    const isExpanded = expanded && canExpand;
    // A workflow decides for itself whether its price is shown. An unset (null) flag counts as enabled.
    const priceShown = (experience: WorkflowExperience) => experience.getWorkflow()?.showPricing !== false;
    // A total which left out the prices that are hidden would be misleading, so it's only shown when every price is.
    const totalShown = !!formatPrice && experiences.length > 0 && experiences.every(priceShown);
    const total = experiences.reduce(
        (sum, experience) => sum + experience.getTotalPriceSubunits() * experience.getQuantity(),
        0,
    );

    return (
        <Panel aria-label="Your cart" $expanded={isExpanded}>
            <HeadingRow>
                <Heading variant="h2">
                    Your cart
                    {experiences.length > 0 && <Count>({experiences.length})</Count>}
                </Heading>
                {canExpand && (
                    <ExpandButton
                        type="button"
                        aria-label={isExpanded ? "Collapse cart" : "Expand cart"}
                        aria-expanded={isExpanded}
                        onClick={() => setExpanded((current) => !current)}
                    >
                        {isExpanded ? (
                            <ChevronDown size={22} aria-hidden="true" />
                        ) : (
                            <ChevronUp size={22} aria-hidden="true" />
                        )}
                    </ExpandButton>
                )}
            </HeadingRow>
            {experiences.length === 0 ? (
                <Empty>Nothing here yet. Choose a product to get started.</Empty>
            ) : (
                <Lines $expanded={isExpanded}>
                    {experiences.map((experience) => {
                        const name = experience.getTransaction().designName || experience.getProduct()?.name;
                        const image = imageOf(experience);
                        const quantity = experience.getQuantity();
                        const price = experience.getTotalPriceSubunits() * quantity;
                        return (
                            <Line key={experienceId(experience)}>
                                {image && <Thumbnail src={image} alt="" />}
                                <Details>
                                    <Name>{name}</Name>
                                    {formatPrice && priceShown(experience) && price > 0 && (
                                        <Price>{formatPrice(price)}</Price>
                                    )}
                                </Details>
                                <QuantityControl
                                    name={name ?? "item"}
                                    quantity={quantity}
                                    disabled={busy}
                                    onChange={(next) => onQuantityChange(experience, next)}
                                />
                                <RemoveButton
                                    type="button"
                                    aria-label={`Remove ${name ?? "item"}`}
                                    disabled={busy}
                                    onClick={() => onRemove(experience)}
                                >
                                    <Trash2 size={18} aria-hidden="true" />
                                </RemoveButton>
                            </Line>
                        );
                    })}
                </Lines>
            )}
            <Footer>
                {totalShown && total > 0 && (
                    <Total>
                        <Typography variant="span">Total</Typography>
                        <Typography variant="span">{formatPrice(total)}</Typography>
                    </Total>
                )}
                <Button fullWidth disabled={busy || !canContinue || experiences.length === 0} onClick={onContinue}>
                    Continue
                </Button>
            </Footer>
        </Panel>
    );
};

export default Cart;
