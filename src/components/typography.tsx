import { FunctionComponent } from "react";
import styled from "styled-components";

// TODO: import theme config and use values

type Variant = "p" | "h1" | "h2" | "h3" | "span";

const StyledText = styled.p`
    /* Add common typography styles here if needed */
`;

const Typography: FunctionComponent<React.ComponentProps<"p"> & { variant?: Variant }> = ({
    children,
    variant = "p",
    ...props
}) => {
    return (
        <StyledText as={variant} {...props}>
            {children}
        </StyledText>
    );
};

export default Typography;
