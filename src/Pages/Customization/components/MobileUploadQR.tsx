import { FunctionComponent, useEffect, useRef } from "react";
import { Asset, MobileUploadSession } from "@spiffcommerce/core";
import styled from "styled-components";
import Button from "../../../components/button";
import useTheme from "../../../hooks/useTheme";
import Typography from "../../../components/typography";

const QR_SIZE = 300;

const Panel = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 24px;
    box-sizing: border-box;
    background-color: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
`;

const QrFrame = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${QR_SIZE}px;
    max-width: 100%;
    aspect-ratio: 1;
    background-color: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
`;

const QrImage = styled.img`
    width: 100%;
    height: 100%;
`;

const Waiting = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    color: #666;
    font-size: 14px;
`;

const Spinner = styled.span<{ $color: string }>`
    width: 16px;
    height: 16px;
    border: 2px solid ${(props) => props.$color};
    border-top-color: transparent;
    border-radius: 50%;
    animation: mobile-upload-spin 0.8s linear infinite;

    @keyframes mobile-upload-spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

const MobileUploadQR: FunctionComponent<{
    /** The mobile upload session created by core, which supplies the QR code and reports when the file arrives. */
    session: MobileUploadSession;
    onCancel: () => void;
    onUploadComplete: (asset: Asset) => void;
}> = ({ session, onCancel, onUploadComplete }) => {
    const theme = useTheme();
    // Kept in a ref so a new callback never restarts the wait, which can't be resumed once cancelled.
    const onUploadCompleteRef = useRef(onUploadComplete);
    onUploadCompleteRef.current = onUploadComplete;

    useEffect(() => {
        session.waitForUpload().then((asset) => {
            if (asset) onUploadCompleteRef.current(asset);
        });
        return () => session.cancel();
    }, [session]);

    return (
        <Panel>
            <Typography variant="h3">Upload from your mobile</Typography>
            <Typography variant="p" style={{ textAlign: "center", color: "#666", margin: 0 }}>
                Scan this QR code with your mobile device to upload a photo
            </Typography>
            <QrFrame>
                <QrImage src={session.qrCodeDataUrl} alt="QR Code for mobile upload" />
            </QrFrame>
            <Waiting>
                <Spinner $color={theme.primaryColor} />
                Waiting for mobile file upload
            </Waiting>
            <Button type="button" fullWidth onClick={onCancel}>
                Back to upload
            </Button>
        </Panel>
    );
};

export default MobileUploadQR;
