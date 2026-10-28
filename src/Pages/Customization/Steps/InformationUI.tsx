import { FunctionComponent } from "react";
import { Step, AnyStepData, InformationStepData } from "@spiffcommerce/core";
import styled from "styled-components";

const Container = styled.div`
    padding: 16px;

    & p {
        margin: 8px 0;
        line-height: 1.5;
    }
`;

const InformationUI: FunctionComponent<{
    step: Step<AnyStepData>;
}> = ({ step }) => {
    const data = step.data as InformationStepData;
    return (
        <Container data-test-step-type="information">
            <div dangerouslySetInnerHTML={{ __html: data.content || "" }} />
        </Container>
    );
};

export default InformationUI;
