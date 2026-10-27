import { FunctionComponent } from "react";

// TODO: import theme config and use values

const Button: FunctionComponent<React.ComponentProps<"button">> = ({ children, ...props }) => {
    return (
        <button
            style={{
                borderRadius: "5px",
                padding: "5px",
            }}
            type="button"
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
