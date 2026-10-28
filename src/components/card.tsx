import { FunctionComponent } from "react";
import styled from "styled-components";

// TODO: import theme config and use values

const CardContainer = styled.div`
    border: 1px solid black;
    border-radius: 5px;
    box-shadow: black 0px 0px 2px 0.1px;
    padding: 15px;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
`;

const Card: FunctionComponent<React.ComponentProps<"div">> = ({ children, ...props }) => {
    return <CardContainer {...props}>{children}</CardContainer>;
};

export default Card;
