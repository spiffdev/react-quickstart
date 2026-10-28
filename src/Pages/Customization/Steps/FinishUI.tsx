import { FunctionComponent, useState } from "react";
import { Step, AnyStepData } from "@spiffcommerce/core";
import styled from "styled-components";
import Button from "../../../components/button";

const Container = styled.div`
    padding: 16px;
`;

const Title = styled.h2`
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

const SummaryTitle = styled.h3`
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

const TermsLink = styled.span`
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

const FinishUI: FunctionComponent<{
    step: Step<AnyStepData>;
    onFinished?: () => void;
}> = ({ onFinished }) => {
    const [isConfirmed, setIsConfirmed] = useState(false);

    return (
        <Container data-test-step-type="finish">
            <Title>Review Your Design</Title>
            <OrderSummary>
                <SummaryTitle>Order Summary</SummaryTitle>
                <SummaryItem>
                    <span>Base Price</span>
                    <span>$0.00</span>
                </SummaryItem>
                <SummaryItem>
                    <span>Customization</span>
                    <span>$0.00</span>
                </SummaryItem>
                <SummaryItem>
                    <strong>Total</strong>
                    <strong>$0.00</strong>
                </SummaryItem>
            </OrderSummary>
            <ButtonGroup>
                <Button fullWidth>Download Preview</Button>
            </ButtonGroup>
            <CheckboxContainer>
                <Checkbox
                    type="checkbox"
                    id="confirm-design"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                />
                <Label htmlFor="confirm-design">
                    I agree to the <TermsLink>terms and conditions</TermsLink>
                </Label>
            </CheckboxContainer>
            <Button fullWidth disabled={!isConfirmed} onClick={onFinished}>
                Complete Design
            </Button>
        </Container>
    );
};

export default FinishUI;
