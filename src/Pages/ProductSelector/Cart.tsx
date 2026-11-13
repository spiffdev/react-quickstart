import { FunctionComponent, useState } from "react";
import { WorkflowExperience } from "@spiffcommerce/core";
import { Minus, Plus, Trash2 } from "lucide-react";
import styled from "styled-components";
import { MEDIA } from "../../layout";
import Button from "../../components/button";
import Typography from "../../components/typography";
import useCurrency from "../../hooks/useCurrency";

const Panel = styled.aside`
    flex: 0 0 320px;
    display: flex;
    flex-direction: column;
    min-height: 0;
    box-sizing: border-box;
    border-left: 1px solid #e0e0e0;
    background-color: #fff;

    @media ${MEDIA.stacked} {
        flex: 0 1 auto;
        max-height: 45%;
        border-left: none;
        border-top: 1px solid #e0e0e0;
    }
`;

const Heading = styled(Typography)`
    margin: 0;
    padding: 16px 16px 8px;
    font-size: 18px;
    font-weight: 600;
`;

const Lines = styled.ul`
    flex: 1 1 0;
    min-height: 0;
    margin: 0;
    padding: 0 16px;
    overflow-y: auto;
    list-style: none;
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

const StepperButton = styled.button`
    display: inline-flex;
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

/** A quantity which is only applied once the customer has finished typing it. */
const QuantityControl: FunctionComponent<{
    name: string;
    quantity: number;
    disabled?: boolean;
    onChange: (quantity: number) => void;
}> = ({ name, quantity, disabled, onChange }) => {
    // What is being typed, while it differs from the quantity.
    const [draft, setDraft] = useState<string | undefined>(undefined);
    const commit = () => {
        const parsed = Math.floor(Number(draft));
        setDraft(undefined);
        if (draft !== undefined && parsed >= 1 && parsed !== quantity) onChange(parsed);
    };
    return (
        <Stepper>
            <StepperButton
                type="button"
                aria-label={`Decrease quantity of ${name}`}
                disabled={disabled || quantity <= 1}
                onClick={() => onChange(quantity - 1)}
            >
                <Minus size={14} aria-hidden="true" />
            </StepperButton>
            <QuantityInput
                type="number"
                min={1}
                aria-label={`Quantity of ${name}`}
                disabled={disabled}
                value={draft ?? quantity}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
            />
            <StepperButton
                type="button"
                aria-label={`Increase quantity of ${name}`}
                disabled={disabled}
                onClick={() => onChange(quantity + 1)}
            >
                <Plus size={14} aria-hidden="true" />
            </StepperButton>
        </Stepper>
    );
};

const RemoveButton = styled.button`
    flex: none;
    display: inline-flex;
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
}> = ({ experiences, onRemove, onQuantityChange, onContinue, busy }) => {
    const formatPrice = useCurrency();
    // A workflow decides for itself whether its price is shown. An unset (null) flag counts as enabled.
    const priceShown = (experience: WorkflowExperience) => experience.getWorkflow()?.showPricing !== false;
    // A total which left out the prices that are hidden would be misleading, so it's only shown when every price is.
    const totalShown = !!formatPrice && experiences.length > 0 && experiences.every(priceShown);
    const total = experiences.reduce(
        (sum, experience) => sum + experience.getTotalPriceSubunits() * experience.getQuantity(),
        0,
    );

    return (
        <Panel aria-label="Your cart">
            <Heading variant="h2">Your cart</Heading>
            {experiences.length === 0 ? (
                <Empty>Nothing here yet. Choose a product to get started.</Empty>
            ) : (
                <Lines>
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
                <Button fullWidth disabled={busy || experiences.length === 0} onClick={onContinue}>
                    Continue
                </Button>
            </Footer>
        </Panel>
    );
};

export default Cart;
