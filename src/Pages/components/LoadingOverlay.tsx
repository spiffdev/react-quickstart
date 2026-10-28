import { FunctionComponent } from "react";
import LoadingSpinner from "./LoadingSpinner";

const LoadingOverlay: FunctionComponent<{
    size?: number;
    color?: string;
    thickness?: number;
    backgroundColor?: string;
    message?: string;
}> = ({ size, color, thickness, backgroundColor = "rgba(255, 255, 255, 0.8)", message }) => {
    return (
        <div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
                zIndex: 9999,
            }}
        >
            <LoadingSpinner size={size} color={color} thickness={thickness} />
            {message && (
                <div
                    style={{
                        fontSize: "16px",
                        color: color || "#000",
                    }}
                >
                    {message}
                </div>
            )}
        </div>
    );
};

export default LoadingOverlay;
