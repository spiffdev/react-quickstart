import { FunctionComponent, MouseEvent, TouchEvent, useCallback, useEffect, useRef, useState } from "react";
import { FrameService, generate } from "@spiffcommerce/core";
import styled from "styled-components";
import Typography from "../../../components/typography";

const FRAME_BORDER_WIDTH = 24;

interface CachedTouch {
    first?: { lastX: number; lastY: number };
    second?: { lastX: number; lastY: number };
}

const EventSurface = styled.div`
    position: relative;
    box-sizing: border-box;
    background-color: #e0e0e0;
    border: 1px dashed #e0e0e0;
    border-radius: 10px;
    touch-action: none;
    cursor: grab;
`;

const Svg = styled.svg`
    display: block;
    margin: 0 auto;
    max-height: 100%;
    max-width: 100%;
`;

const Processing = styled.div`
    padding: 24px 16px;
    text-align: center;
`;

const ProcessingBar = styled.div`
    height: 4px;
    margin-top: 12px;
    overflow: hidden;
    background-color: #e0e0e0;
    border-radius: 2px;

    &::after {
        content: "";
        display: block;
        width: 40%;
        height: 100%;
        background-color: #007bff;
        animation: image-cropper-progress 1.2s ease-in-out infinite;
    }

    @keyframes image-cropper-progress {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(250%);
        }
    }
`;

const Controls = styled.div`
    padding: 12px;
    background-color: #fff;
`;

const ControlRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
`;

const ControlLabel = styled(Typography)`
    min-width: 40px;
    font-size: 11px;
    text-align: right;
    color: #9e9e9e;
    white-space: nowrap;
`;

const Slider = styled.input`
    flex: 1 1 0;
    min-width: 0;
`;

const ResetValue = styled(ControlLabel)`
    min-width: 40px;
    cursor: pointer;
    user-select: none;

    &:hover {
        color: #007bff;
    }
`;

const rotationToSlider = (rotation: number) => {
    const normalized = ((rotation % 360) + 360) % 360;
    return normalized > 180 ? normalized - 360 : normalized;
};

const sliderToRotation = (value: number) => ((value % 360) + 360) % 360;

const ImageCropperControls: FunctionComponent<{
    frameService: FrameService;
    onTouchedControls: () => void;
    showScale: boolean;
    showRotation: boolean;
}> = ({ frameService, onTouchedControls, showScale, showRotation }) => {
    const [zoomSliderValue, setZoomSliderValue] = useState(100);
    const [rotationSliderValue, setRotationSliderValue] = useState(0);
    const [initialZoom, setInitialZoom] = useState(1);
    const [zoomMin, setZoomMin] = useState(0.5);
    const [zoomMax, setZoomMax] = useState(2);

    useEffect(() => {
        const offsets = frameService.getOffsets();
        const currentZoom = offsets?.[0].zoom || 1;
        setInitialZoom(currentZoom);

        // Centre the slider on the starting zoom, so the thumb sits in the middle at 100%.
        const minScale = frameService.minZoomScale[0];
        const maxScale = frameService.maxZoomScale[0];
        const maxDistance = Math.max(currentZoom - minScale, maxScale - currentZoom);
        setZoomMin(Math.max(minScale, currentZoom - maxDistance));
        setZoomMax(Math.min(maxScale, currentZoom + maxDistance));
        setZoomSliderValue(100);
        setRotationSliderValue(rotationToSlider(offsets?.[0].rotation || 0));
    }, [frameService]);

    useEffect(() => {
        frameService.onZoom(() => {
            const currentZoom = frameService.getOffsets()?.[0].zoom || 1;
            setZoomSliderValue((currentZoom / initialZoom) * 100);
        });
    }, [frameService, initialZoom]);

    const handleZoom = (sliderValue: number) => {
        const frameData = frameService.getFrameData();
        if (frameData) {
            const offsets = frameService.getOffsets();
            const referenceZoom = ((sliderValue / 100) * initialZoom) / (offsets?.[0].zoom ?? 1);
            const zoom = frameData.map((_frame, index) => (offsets?.[index]?.zoom ?? 1) * referenceZoom);
            frameService.setZoom(
                zoom,
                frameData.map((frame) => frame.width / 2),
                frameData.map((frame) => frame.height / 2),
            );
        }
        onTouchedControls();
    };

    const handleRotation = (sliderValue: number) => {
        const frameData = frameService.getFrameData();
        if (frameData) {
            setRotationSliderValue(sliderValue);
            frameService.setRotation(new Array(frameData.length).fill(sliderToRotation(sliderValue)));
        }
        onTouchedControls();
    };

    return (
        <Controls>
            {showScale && (
                <ControlRow>
                    <ControlLabel variant="span">Scale</ControlLabel>
                    <Slider
                        type="range"
                        aria-label="Scale"
                        min={(zoomMin / initialZoom) * 100}
                        max={(zoomMax / initialZoom) * 100}
                        step={0.5}
                        value={zoomSliderValue}
                        onChange={(event) => handleZoom(Number(event.target.value))}
                    />
                    <ControlLabel variant="span">{Math.round(zoomSliderValue)}%</ControlLabel>
                </ControlRow>
            )}
            {showRotation && (
                <ControlRow>
                    <ControlLabel variant="span">Rotate</ControlLabel>
                    <Slider
                        type="range"
                        aria-label="Rotate"
                        min={-180}
                        max={180}
                        step={1}
                        value={rotationSliderValue}
                        onChange={(event) => handleRotation(Number(event.target.value))}
                    />
                    <ResetValue variant="span" title="Click to reset" onClick={() => handleRotation(0)}>
                        {rotationSliderValue}°
                    </ResetValue>
                </ControlRow>
            )}
        </Controls>
    );
};

const ImageCropper: FunctionComponent<{
    frameService: FrameService;
    overlayImageUrl?: string;
    showScale?: boolean;
    showRotation?: boolean;
}> = ({ frameService, overlayImageUrl, showScale = true, showRotation = false }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const maskRectRef = useRef<SVGRectElement>(null);
    const dragging = useRef(false);
    const cachedTouch = useRef<CachedTouch>({});
    const touchResetTimer = useRef<number | undefined>(undefined);
    const [framingUuid] = useState(() => generate());
    const [snapGuides, setSnapGuides] = useState({ horizontal: false, vertical: false });
    const [, setVersion] = useState(0);
    const refresh = useCallback(() => setVersion((version) => version + 1), []);

    const imageData = frameService.getImageData();
    const frameDatas = frameService.getFrameData();
    const hasData = !!imageData && !!frameDatas;

    useEffect(() => {
        frameService.onZoom(refresh);
        frameService.onRotation(refresh);
    }, [frameService, refresh]);

    useEffect(() => () => window.clearTimeout(touchResetTimer.current), []);

    // The page must not scroll while zooming the image with the wheel.
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const preventScroll = (event: Event) => event.preventDefault();
        svg.addEventListener("wheel", preventScroll, { passive: false });
        return () => svg.removeEventListener("wheel", preventScroll);
    }, [hasData]);

    const getUnusedSpace = useCallback(() => {
        if (!svgRef.current || !maskRectRef.current) {
            throw new Error("Missing Reference");
        }
        const surface = svgRef.current.getBoundingClientRect();
        const rect = maskRectRef.current.getBoundingClientRect();
        return { x: surface.width - rect.width, y: surface.height - rect.height };
    }, []);

    const getFrameDivisor = useCallback(() => {
        if (!svgRef.current) {
            throw new Error("Missing Reference");
        }
        const surface = svgRef.current.getBoundingClientRect();
        const unusedSpace = getUnusedSpace();
        const totalBorderSpace = FRAME_BORDER_WIDTH * 2;
        const frameData = frameService.getFrameData();
        if (!frameData) {
            throw new Error("No frame data");
        }
        return frameData.map((frame) => ({
            x: (surface.width - unusedSpace.x) / (frame.width + totalBorderSpace),
            y: (surface.height - unusedSpace.y) / (frame.height + totalBorderSpace),
        }));
    }, [frameService, getUnusedSpace]);

    const onZoom = useCallback(
        (zoomDelta: number, cX: number[], cY: number[]) => {
            const frameData = frameService.getFrameData();
            const offsets = frameService.getOffsets();
            const image = frameService.getImageData();
            if (!frameData || !offsets || !image) return;

            const zoomData = frameData.map((_frame, index) => {
                const currentScale = (image.width * offsets[index].zoom) / image.width;
                const zoomSpeed = 1 + Math.abs(zoomDelta) * 0.005;
                let newScale = zoomDelta > 0 ? currentScale * zoomSpeed : currentScale / zoomSpeed;

                const minimumScale = image.width * frameService.minZoomScale[index];
                if (image.width * newScale < minimumScale) {
                    newScale = minimumScale / image.width;
                }
                const maximumScale = image.width * frameService.maxZoomScale[index];
                if (image.width * newScale > maximumScale) {
                    newScale = maximumScale / image.width;
                }
                return { zoom: (image.width * newScale) / image.width, cX: cX[index], cY: cY[index] };
            });
            frameService.setZoom(
                zoomData.map((z) => z.zoom),
                zoomData.map((z) => z.cX),
                zoomData.map((z) => z.cY),
            );
        },
        [frameService],
    );

    const onWheel = useCallback(
        (event: React.WheelEvent) => {
            if (!svgRef.current) return;
            const surface = svgRef.current.getBoundingClientRect();
            const unusedSpace = getUnusedSpace();
            const divisors = getFrameDivisor();
            onZoom(
                event.deltaY,
                divisors.map((d) => (event.clientX - surface.left - unusedSpace.x / 2) / d.x - FRAME_BORDER_WIDTH),
                divisors.map((d) => (event.clientY - surface.top - unusedSpace.y / 2) / d.y - FRAME_BORDER_WIDTH),
            );
        },
        [getFrameDivisor, getUnusedSpace, onZoom],
    );

    const onMove = useCallback(
        (xDelta: number, yDelta: number) => {
            const offsets = frameService.getOffsets();
            const frameData = frameService.getFrameData();
            const image = frameService.getImageData();
            if (!offsets || !frameData || !image) return;
            const divisors = getFrameDivisor();

            let verticalSnap = false;
            let horizontalSnap = false;

            const leftWithSnap = (left: number, index: number) => {
                const width = image.width * offsets[index].zoom;
                const precision = frameData[index].width / 200;
                const frameCenter = frameData[index].width / 2;
                const frameRight = frameData[index].width;
                if (Math.abs(left + width / 2 - frameCenter) <= precision) {
                    verticalSnap = true;
                    return frameCenter - width / 2;
                }
                if (Math.abs(left) <= precision) return 0;
                if (Math.abs(left + width - frameRight) <= precision) return frameRight - width;
                return left;
            };

            const topWithSnap = (top: number, index: number) => {
                const height = image.height * offsets[index].zoom;
                const precision = frameData[index].height / 200;
                const frameCenter = frameData[index].height / 2;
                const frameBottom = frameData[index].height;
                if (Math.abs(top + height / 2 - frameCenter) <= precision) {
                    horizontalSnap = true;
                    return frameCenter - height / 2;
                }
                if (Math.abs(top) <= precision) return 0;
                if (Math.abs(top + height - frameBottom) <= precision) return frameBottom - height;
                return top;
            };

            frameService.updateOffsets(
                offsets.map((offset, index) => ({
                    ...offset,
                    x: leftWithSnap(offset.x + xDelta / divisors[index].x, index),
                    y: topWithSnap(offset.y + yDelta / divisors[index].y, index),
                })),
            );
            setSnapGuides({ horizontal: horizontalSnap, vertical: verticalSnap });
            refresh();
        },
        [frameService, getFrameDivisor, refresh],
    );

    const onMouseMove = useCallback(
        (event: MouseEvent) => {
            const first = cachedTouch.current.first;
            if (dragging.current && first) {
                onMove(event.pageX - first.lastX, event.pageY - first.lastY);
            }
            cachedTouch.current = { first: { lastX: event.pageX, lastY: event.pageY } };
        },
        [onMove],
    );

    const onTouchStart = useCallback((event: TouchEvent) => {
        dragging.current = true;
        cachedTouch.current = {
            first: { lastX: event.touches[0].clientX, lastY: event.touches[0].clientY },
        };
    }, []);

    const onTouchMove = useCallback(
        (event: TouchEvent) => {
            const cached = cachedTouch.current;
            if (dragging.current && event.touches.length === 1) {
                const x = event.touches[0].clientX;
                const y = event.touches[0].clientY;
                onMove(x - (cached.first?.lastX ?? x), y - (cached.first?.lastY ?? y));
            }

            if (event.touches.length === 2 && event.targetTouches[0] && event.targetTouches[1]) {
                const [t1, t2] = [event.targetTouches[0], event.targetTouches[1]];
                const divisors = getFrameDivisor();
                const unusedSpace = getUnusedSpace();
                const distanceX = Math.abs(t1.clientX - t2.clientX);
                const distanceY = Math.abs(t1.clientY - t2.clientY);
                const cachedDistanceX = Math.abs(
                    (cached.first?.lastX ?? t1.clientX) - (cached.second?.lastX ?? t2.clientX),
                );
                const cachedDistanceY = Math.abs(
                    (cached.first?.lastY ?? t1.clientY) - (cached.second?.lastY ?? t2.clientY),
                );
                const diffX = cachedDistanceX - distanceX;
                const diffY = cachedDistanceY - distanceY;
                const centerX = (t1.pageX + t2.pageX) / 2;
                const centerY = (t1.pageY + t2.pageY) / 2;
                const rect = event.currentTarget.getBoundingClientRect();
                const delta = Math.sqrt(diffX * diffX + diffY * diffY);

                onZoom(
                    diffX + diffY > 0 ? -delta : delta,
                    divisors.map((d) => (centerX - rect.left - unusedSpace.x / 2) / d.x),
                    divisors.map((d) => (centerY - rect.top - unusedSpace.y / 2) / d.y),
                );
            }

            cachedTouch.current = {
                first: event.targetTouches[0]
                    ? { lastX: event.targetTouches[0].clientX, lastY: event.targetTouches[0].clientY }
                    : undefined,
                second: event.targetTouches[1]
                    ? { lastX: event.targetTouches[1].clientX, lastY: event.targetTouches[1].clientY }
                    : undefined,
            };
        },
        [getFrameDivisor, getUnusedSpace, onMove, onZoom],
    );

    const onReleaseOrExit = useCallback(() => {
        dragging.current = false;
        setSnapGuides({ horizontal: false, vertical: false });
    }, []);

    // Using the sliders shouldn't leave a stale touch position behind for the next drag.
    const onTouchedControls = useCallback(() => {
        window.clearTimeout(touchResetTimer.current);
        touchResetTimer.current = window.setTimeout(() => {
            cachedTouch.current = { first: { lastX: 0, lastY: 0 } };
        }, 200);
    }, []);

    if (!imageData || !frameDatas) {
        return (
            <Processing>
                <Typography variant="p">Processing photo...</Typography>
                <ProcessingBar />
            </Processing>
        );
    }

    const frameData = frameDatas[0];
    const offsets = frameService.getOffsets();
    const offset = offsets?.[0];
    const thresholdSettings = frameService.getThresholdSettings();
    const thresholdFilterId = "spiff-frame-threshold-image-cropper";
    const thresholdTableValues = !thresholdSettings.threshold
        ? ""
        : thresholdSettings.invertThreshold
          ? "1 ".repeat(thresholdSettings.threshold) + "0 ".repeat(256 - thresholdSettings.threshold)
          : "0 ".repeat(thresholdSettings.threshold) + "1 ".repeat(256 - thresholdSettings.threshold);
    const saturation = thresholdSettings.thresholdSaturation;

    const imageWidth = imageData.width * (offset?.zoom ?? 1);
    const imageHeight = imageData.height * (offset?.zoom ?? 1);
    const imageX = (offset?.x ?? 0) + FRAME_BORDER_WIDTH;
    const imageY = (offset?.y ?? 0) + FRAME_BORDER_WIDTH;
    const rotation = offset?.rotation || 0;
    const totalWidth = frameData.width + FRAME_BORDER_WIDTH * 2;
    const totalHeight = frameData.height + FRAME_BORDER_WIDTH * 2;

    return (
        <>
            <EventSurface
                onDragStart={(event) => event.preventDefault()}
                onWheel={onWheel}
                onMouseDown={() => (dragging.current = true)}
                onMouseUp={onReleaseOrExit}
                onMouseLeave={onReleaseOrExit}
                onMouseMove={onMouseMove}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onReleaseOrExit}
            >
                <Svg ref={svgRef} viewBox={`0 0 ${totalWidth} ${totalHeight}`}>
                    <defs>
                        <mask id={`frame${framingUuid}`}>
                            <rect width="100%" height="100%" fill="#222" />
                            <path
                                transform={`translate(${FRAME_BORDER_WIDTH}, ${FRAME_BORDER_WIDTH})`}
                                d={frameData.path}
                                fill="white"
                            />
                        </mask>
                        {thresholdSettings.useThreshold && (
                            <filter id={thresholdFilterId} colorInterpolationFilters="sRGB">
                                <feColorMatrix
                                    type="matrix"
                                    values={`${saturation} ${saturation} ${saturation} 0 0 ${saturation} ${saturation} ${saturation} 0 0 ${saturation} ${saturation} ${saturation} 0 0 0 0 0 1 0`}
                                    result="greyscale"
                                />
                                <feComponentTransfer in="greyscale">
                                    <feFuncR type="discrete" tableValues={thresholdTableValues} />
                                    <feFuncG type="discrete" tableValues={thresholdTableValues} />
                                    <feFuncB type="discrete" tableValues={thresholdTableValues} />
                                </feComponentTransfer>
                            </filter>
                        )}
                    </defs>
                    <rect
                        ref={maskRectRef}
                        width={totalWidth}
                        height={totalHeight}
                        fill="#e0e0e0"
                        mask={`url(#frame${framingUuid})`}
                    />
                    <rect
                        x={FRAME_BORDER_WIDTH}
                        y={FRAME_BORDER_WIDTH}
                        width={frameData.width}
                        height={frameData.height}
                        rx="4"
                        ry="4"
                        fill="none"
                        stroke="#9e9e9e"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        opacity="0.6"
                    />
                    <text
                        x={FRAME_BORDER_WIDTH + 8}
                        y={FRAME_BORDER_WIDTH + 14}
                        fill="#616161"
                        fontSize="8"
                        fontWeight="500"
                        fontFamily="Arial, Helvetica, sans-serif"
                        opacity="0.4"
                        pointerEvents="none"
                        style={{ userSelect: "none" }}
                    >
                        PRINT REGION
                    </text>
                    <g mask={`url(#frame${framingUuid})`}>
                        <g transform={`rotate(${rotation} ${imageX + imageWidth / 2} ${imageY + imageHeight / 2})`}>
                            <image
                                href={frameService.getImageSrc()}
                                x={imageX}
                                y={imageY}
                                width={imageWidth}
                                height={imageHeight}
                                filter={thresholdSettings.useThreshold ? `url(#${thresholdFilterId})` : undefined}
                            />
                        </g>
                    </g>
                    {overlayImageUrl && (
                        <image
                            pointerEvents="none"
                            transform={`translate(${FRAME_BORDER_WIDTH}, ${FRAME_BORDER_WIDTH})`}
                            width={frameData.width}
                            height={frameData.height}
                            href={overlayImageUrl}
                        />
                    )}
                    {snapGuides.vertical && (
                        <line
                            x1={FRAME_BORDER_WIDTH + frameData.width / 2}
                            y1={FRAME_BORDER_WIDTH}
                            x2={FRAME_BORDER_WIDTH + frameData.width / 2}
                            y2={FRAME_BORDER_WIDTH + frameData.height}
                            stroke="#757575"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            opacity="0.9"
                        />
                    )}
                    {snapGuides.horizontal && (
                        <line
                            x1={FRAME_BORDER_WIDTH}
                            y1={FRAME_BORDER_WIDTH + frameData.height / 2}
                            x2={FRAME_BORDER_WIDTH + frameData.width}
                            y2={FRAME_BORDER_WIDTH + frameData.height / 2}
                            stroke="#757575"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            opacity="0.9"
                        />
                    )}
                </Svg>
            </EventSurface>
            <ImageCropperControls
                frameService={frameService}
                onTouchedControls={onTouchedControls}
                showScale={showScale}
                showRotation={showRotation}
            />
        </>
    );
};

export default ImageCropper;
