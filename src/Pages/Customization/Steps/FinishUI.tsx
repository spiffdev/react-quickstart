import { FunctionComponent, useCallback, useState } from "react";
import { ExportedStepData } from "@spiffcommerce/core";
import styled from "styled-components";
import Button from "../../../components/button";
import useCurrency from "../../../hooks/useCurrency";
import Typography from "../../../components/typography";
import TermsScreen from "../components/TermsScreen";

const Container = styled.div`
    padding: 16px;
`;

const Title = styled(Typography)`
    margin: 0 0 16px 0;
    font-size: 24px;
    font-weight: 600;
`;

const OrderSummary = styled.div`
    background: #f5f5f5;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
`;

const SummaryTitle = styled(Typography)`
    margin: 0 0 12px 0;
    font-size: 18px;
    font-weight: 600;
`;

const SummaryItem = styled.div`
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #e0e0e0;

    &:last-child {
        border-bottom: none;
    }
`;

const SummaryValue = styled.div`
    display: flex;
    gap: 12px;
`;

const CheckboxContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 16px 0;
`;

const Checkbox = styled.input`
    width: 18px;
    height: 18px;
    cursor: pointer;
`;

const Label = styled.label`
    font-size: 14px;
    cursor: pointer;
`;

const TermsLink = styled(Typography)`
    color: #007bff;
    text-decoration: underline;
    cursor: pointer;

    &:hover {
        color: #0056b3;
    }
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 12px;
    margin-top: 16px;
`;

const formatValue = (value: string) =>
    value.startsWith("http") ? (
        <a href={value} target="_blank" rel="noopener noreferrer">
            Link
        </a>
    ) : (
        value
    );

const FinishUI: FunctionComponent<{
    termsMarkdown?: string;
    exportedData: ExportedStepData[];
    basePrice: number;
    selectionCost: number;
    showPricing: boolean;
    onFinished?: () => void | Promise<void>;
}> = ({ termsMarkdown, exportedData, basePrice, selectionCost, showPricing, onFinished }) => {
    const currencyFormatter = useCurrency();
    const totalPrice = basePrice + selectionCost;
    // Prices are only shown when enabled, chargeable, and a presentment currency is available.
    const formatPrice = showPricing && totalPrice > 0 ? currencyFormatter : undefined;
    const rows = exportedData.flatMap((step) =>
        step.properties.map((property, index) => ({
            ...property,
            key: `${step.stepId}-${index}`,
            title: index === 0 ? step.title : "",
        })),
    );

    const [isConfirmed, setIsConfirmed] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [finishing, setFinishing] = useState(false);

    const handleFinish = useCallback(async () => {
        setFinishing(true);
        try {
            await onFinished?.();
        } catch (error) {
            console.error("Error finishing design:", error);
            setFinishing(false);
        }
    }, [onFinished]);

    const handleAgree = useCallback(() => {
        setIsConfirmed(true);
        setShowTerms(false);
        handleFinish();
    }, [handleFinish]);

    return (
        <Container data-test-step-type="finish">
            <Title variant="h2">Review Your Design</Title>
            {(rows.length > 0 || formatPrice) && (
                <OrderSummary>
                    <SummaryTitle variant="h3">Order Summary</SummaryTitle>
                    {rows.map((row) => (
                        <SummaryItem key={row.key}>
                            <Typography variant="span">{row.title}</Typography>
                            <SummaryValue>
                                <Typography variant="span">{formatValue(row.value)}</Typography>
                                {formatPrice && row.priceModifier > 0 && (
                                    <Typography variant="span">{formatPrice(row.priceModifier)}</Typography>
                                )}
                            </SummaryValue>
                        </SummaryItem>
                    ))}
                    {formatPrice && (
                        <>
                            {basePrice > 0 && (
                                <SummaryItem>
                                    <Typography variant="span">Base Price</Typography>
                                    <Typography variant="span">{formatPrice(basePrice)}</Typography>
                                </SummaryItem>
                            )}
                            <SummaryItem>
                                <Typography variant="span" style={{ fontWeight: "bold" }}>
                                    Total
                                </Typography>
                                <Typography variant="span" style={{ fontWeight: "bold" }}>
                                    {formatPrice(totalPrice)}
                                </Typography>
                            </SummaryItem>
                        </>
                    )}
                </OrderSummary>
            )}
            <ButtonGroup>
                <Button fullWidth>Download Preview</Button>
            </ButtonGroup>
            {termsMarkdown && (
                <>
                    <CheckboxContainer>
                        <Checkbox
                            type="checkbox"
                            id="confirm-design"
                            checked={isConfirmed}
                            onChange={(e) => setIsConfirmed(e.target.checked)}
                        />
                        <Label htmlFor="confirm-design">
                            I agree to the{" "}
                            <TermsLink
                                variant="span"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setShowTerms(true);
                                }}
                            >
                                terms and conditions
                            </TermsLink>
                        </Label>
                    </CheckboxContainer>
                    <TermsScreen
                        visible={showTerms}
                        source={termsMarkdown}
                        onAgree={handleAgree}
                        onBack={() => setShowTerms(false)}
                    />
                </>
            )}
            <Button fullWidth disabled={(!!termsMarkdown && !isConfirmed) || finishing} onClick={handleFinish}>
                {finishing ? "Adding to cart..." : "Complete Design"}
            </Button>
        </Container>
    );
};

export default FinishUI;
