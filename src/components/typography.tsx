import { FunctionComponent } from "react";

// TODO: import theme config and use values

type Variant = "p" | "h1" | "h2" | "h3" | "span";

const Typography: FunctionComponent<React.ComponentProps<"p"> & { variant?: Variant }> = ({
    children,
    variant = "p",
    ...props
}) => {
    switch (variant) {
        case "h1":
            return <h1 {...props}>{children}</h1>;
        case "h2":
            return <h2 {...props}>{children}</h2>;
        case "h3":
            return <h3 {...props}>{children}</h3>;
        case "span":
            return <span {...props}>{children}</span>;
        default:
            return <p {...props}>{children}</p>;
    }
};

export default Typography;
