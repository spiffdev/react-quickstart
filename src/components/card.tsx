import { FunctionComponent } from "react";

// TODO: import theme config and use values

const Card: FunctionComponent<React.ComponentProps<"div">> = ({ children, ...props }) => {
    return (
        <div
            style={{
                border: "1px solid black",
                borderRadius: "5px",
                boxShadow: "0px 2px 2px black",
                padding: "15px",
                display: "flex",
                flexDirection: "column",
            }}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
