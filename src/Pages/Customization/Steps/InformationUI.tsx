import { FunctionComponent } from "react";
import ReactMarkdown from "react-markdown";
import { InformationStepHandle } from "@spiffcommerce/core";
import styled from "styled-components";

const Container = styled.div`
    padding: 16px;

    & p {
        margin: 8px 0;
        line-height: 1.5;
    }
`;

const InformationUI: FunctionComponent<{
    step: InformationStepHandle;
}> = ({ step }) => {
    return (
        <Container data-test-step-type="information">
            <ReactMarkdown>{step.getContent()}</ReactMarkdown>
        </Container>
    );
};

export default InformationUI;
