import { FunctionComponent, useState } from "react";
import styled from "styled-components";
import Typography from "../../../components/typography";
import TermsScreen from "./TermsScreen";

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
    color: var(--theme-primary-color);
    text-decoration: underline;
    cursor: pointer;

    &:hover {
        color: var(--theme-primary-color-hover);
    }
`;

/**
 * A checkbox for agreeing to terms and conditions, with a link which opens them to be read.
 */
const TermsAgreement: FunctionComponent<{
    id: string;
    markdown: string;
    agreed: boolean;
    onAgreedChange: (agreed: boolean) => void;
    /** Called after the customer agrees from within the terms themselves. */
    onAgree?: () => void;
}> = ({ id, markdown, agreed, onAgreedChange, onAgree }) => {
    const [showTerms, setShowTerms] = useState(false);
    return (
        <>
            <CheckboxContainer>
                <Checkbox type="checkbox" id={id} checked={agreed} onChange={(e) => onAgreedChange(e.target.checked)} />
                <Label htmlFor={id}>
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
                source={markdown}
                onAgree={() => {
                    onAgreedChange(true);
                    setShowTerms(false);
                    onAgree?.();
                }}
                onBack={() => setShowTerms(false)}
            />
        </>
    );
};

export default TermsAgreement;
