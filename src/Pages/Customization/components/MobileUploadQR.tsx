import { FunctionComponent, useEffect, useState } from "react";
import { Asset, assetService } from "@spiffcommerce/core";
import QRCode from "qrcode";
import styled from "styled-components";
import Button from "../../../components/button";
import useTheme from "../../../hooks/useTheme";
import Typography from "../../../components/typography";

const POLL_INTERVAL_MS = 2000;
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
    /** The key of the empty asset the phone will upload into. */
    assetKey: string;
    /** Where the uploaded file will appear. */
    fileLink: string;
    fileType?: string;
    maxSizeBytes?: number;
    logoUrl?: string;
    whitelistedExtensions?: string[];
    primaryColor?: string;
    onCancel: () => void;
    onUploadComplete: (asset: Asset) => void;
}> = ({
    assetKey,
    fileLink,
    fileType,
    maxSizeBytes,
    logoUrl,
    whitelistedExtensions,
    primaryColor: primaryColorOverride,
    onCancel,
    onUploadComplete,
}) => {
    // The phone's upload page is given this colour directly, so it needs the real value rather than a CSS variable.
    const theme = useTheme();
    const primaryColor = primaryColorOverride ?? theme.primaryColor;
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
    const extensionsKey = whitelistedExtensions?.join(",");

    // The phone uploads straight to the asset, so we just wait for the file to appear.
    useEffect(() => {
        let finished = false;
        const checkForUpload = async () => {
            try {
                const response = await fetch(fileLink, { method: "HEAD", mode: "cors" });
                if (response.ok && !finished) {
                    finished = true;
                    window.clearInterval(interval);
                    onUploadComplete(await assetService.getFromServer(assetKey));
                }
            } catch {
                // Not uploaded yet, keep polling.
            }
        };
        const interval = window.setInterval(checkForUpload, POLL_INTERVAL_MS);
        return () => {
            finished = true;
            window.clearInterval(interval);
        };
    }, [assetKey, fileLink, onUploadComplete]);

    useEffect(() => {
        // The upload page is served by the editor on the same origin as this theme.
        const params = new URLSearchParams({ assetKey });
        if (fileType) params.append("fileType", fileType);
        if (maxSizeBytes) params.append("maxSizeBytes", maxSizeBytes.toString());
        if (logoUrl) params.append("logo", encodeURIComponent(logoUrl));
        if (extensionsKey) params.append("whitelistedExtensions", extensionsKey);
        if (primaryColor) params.append("primaryColor", encodeURIComponent(primaryColor));

        QRCode.toDataURL(`${window.location.origin}/#/upload?${params.toString()}`, {
            width: QR_SIZE,
            margin: 2,
            color: { dark: "#000000", light: "#FFFFFF" },
        })
            .then(setQrCodeDataUrl)
            .catch((error) => console.error("Failed to generate QR code:", error));
    }, [assetKey, extensionsKey, fileType, logoUrl, maxSizeBytes, primaryColor]);

    return (
        <Panel>
            <Typography variant="h3">Upload from your mobile</Typography>
            <Typography variant="p" style={{ textAlign: "center", color: "#666", margin: 0 }}>
                Scan this QR code with your mobile device to upload a photo
            </Typography>
            <QrFrame>
                {qrCodeDataUrl ? (
                    <QrImage src={qrCodeDataUrl} alt="QR Code for mobile upload" />
                ) : (
                    <Typography variant="p" style={{ color: "#999", margin: 0 }}>
                        Generating QR code...
                    </Typography>
                )}
            </QrFrame>
            <Waiting>
                <Spinner $color={primaryColor} />
                Waiting for mobile file upload
            </Waiting>
            <Button type="button" fullWidth onClick={onCancel}>
                Back to upload
            </Button>
        </Panel>
    );
};

export default MobileUploadQR;
