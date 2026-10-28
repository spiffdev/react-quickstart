import { FunctionComponent } from "react";
import { Step, InformationStepData } from "@spiffcommerce/core";
import styled from "styled-components";

const Container = styled.div`
    padding: 16px;

    & p {
        margin: 8px 0;
        line-height: 1.5;
    }
`;

const InformationUI: FunctionComponent<{
    step: Step<InformationStepData>;
}> = ({ step }) => {
    return (
        <Container data-test-step-type="information">
            <div dangerouslySetInnerHTML={{ __html: step.stepContent || "" }} />
        </Container>
    );
};

export default InformationUI;
