import { FunctionComponent } from "react";
import styled from "styled-components";

// TODO: import theme config and use values

const StyledButton = styled.button`
    border-radius: 5px;
    padding: 5px;
`;

const Button: FunctionComponent<React.ComponentProps<"button">> = ({ children, ...props }) => {
    return (
        <StyledButton type="button" {...props}>
            {children}
        </StyledButton>
    );
};

export default Button;
