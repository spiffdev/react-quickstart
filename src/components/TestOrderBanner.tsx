import { FunctionComponent } from "react";
import styled from "styled-components";

const Banner = styled.div`
    flex: none;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    color: #663c00;
    background-color: #fff4e5;
    border-bottom: 1px solid #ffd8a8;
`;

/**
 * Warns Partners that orders placed while test orders are enabled are not real.
 */
const TestOrderBanner: FunctionComponent = () => (
    <Banner role="status">
        Test orders are enabled. Orders placed here are for testing only. Turn this off before going live.
    </Banner>
);

export default TestOrderBanner;
