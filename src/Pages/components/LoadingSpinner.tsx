import { FunctionComponent } from "react";

const LoadingSpinner: FunctionComponent<{
    size?: number;
    color?: string;
    thickness?: number;
}> = ({ size = 40, color = "#000", thickness = 4 }) => {
    return (
        <div
            style={{
                width: `${size}px`,
                height: `${size}px`,
                border: `${thickness}px solid rgba(0, 0, 0, 0.1)`,
                borderTop: `${thickness}px solid ${color}`,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
            }}
        >
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
        </div>
    );
};

export default LoadingSpinner;
