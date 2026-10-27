import { FunctionComponent } from "react";

// TODO: import theme config and use values

const Text: FunctionComponent<React.ComponentProps<"p">> = ({ children, ...props }) => {
    // TODO: text variants (e.g. headings)
    return <p {...props}>{children}</p>;
};

export default Text;
