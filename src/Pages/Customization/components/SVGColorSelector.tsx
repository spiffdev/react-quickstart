import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    browserColorToHex,
    ColorDefinition,
    findPmsColors,
    matchHexToPms,
    Variant,
    VariantResource,
} from "@spiffcommerce/core";
import styled from "styled-components";
import Typography from "../../../components/typography";
import { isCustomColor, swatchBackground } from "./customColor";
import VariantGallery from "./VariantGallery";

const CUSTOM_DEBOUNCE_MS = 100;
const PMS_MAX_DISTANCE = 64;
const PMS_RESULT_LIMIT = 50;

export interface ReplacementColor {
    fill?: string;
    stroke?: string;
    variant: VariantResource;
    pmsValue?: string;
}

const Label = styled(Typography)`
    margin: 8px 0;
    font-size: 12px;
    color: #4d4f5c;
`;

const SwatchRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
`;

const Swatch = styled.div<{ $color: string; $selected?: boolean }>`
    width: 36px;
    height: 36px;
    background: ${(props) => props.$color};
    border: 2px solid ${(props) => (props.$selected ? "#007bff" : "#e0e0e0")};
    border-radius: 50%;
    cursor: pointer;
    box-sizing: border-box;
    transition: all 0.2s;

    &:hover {
        border-color: #007bff;
        transform: scale(1.1);
    }
`;

const CustomColorPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 12px 0;
`;

const ColorInput = styled.input`
    width: 100%;
    height: 40px;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
`;

const HexInput = styled.input<{ $invalid?: boolean }>`
    padding: 8px 12px;
    font-size: 14px;
    border: 1px solid ${(props) => (props.$invalid ? "#d32f2f" : "#ccc")};
    border-radius: 4px;
    box-sizing: border-box;
`;

const PmsSection = styled.div`
    position: relative;
    margin-top: 12px;
`;

const PmsInput = styled.input`
    width: 100%;
    padding: 8px 12px;
    font-size: 14px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;

    &:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
    }
`;

const PmsResults = styled.div`
    position: absolute;
    z-index: 2;
    left: 0;
    right: 0;
    max-height: 240px;
    overflow-y: auto;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
`;

const PmsResult = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    font-size: 13px;
    cursor: pointer;
    border-bottom: 1px solid #eee;

    &:hover {
        background-color: #f0f0f0;
    }
`;

const PmsChip = styled.span<{ $color: string }>`
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: ${(props) => props.$color};
    border: 1px solid #ddd;
`;

const stripHash = (color: string) => browserColorToHex(color).replace(/^#/, "");
const toHex = (color: string) => `#${stripHash(color)}`;
const replacementValue = (color: ReplacementColor) => color.fill ?? color.stroke ?? color.variant.color;
const isCustom = (color: ReplacementColor) => isCustomColor(replacementValue(color));

const SVGColorSelector: FunctionComponent<{
    availableColors: ReplacementColor[];
    existingColors: { [key: string]: ColorDefinition } | undefined;
    onChange: (key: string, fill: string, pmsValue?: string) => void;
    showPms: boolean;
    /** When there is only one color to edit, skip straight to choosing its replacement. */
    singleColorOnly?: boolean;
    /** Forces the thumbnail gallery on or off; by default it's used when any color has a thumbnail. */
    useGallery?: boolean;
}> = ({ availableColors, existingColors, onChange, showPms, singleColorOnly, useGallery }) => {
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [customMode, setCustomMode] = useState(false);
    const [customHex, setCustomHex] = useState("#000000");
    const [pmsQuery, setPmsQuery] = useState("");
    const [pmsOpen, setPmsOpen] = useState(false);
    const customTimer = useRef<number | undefined>(undefined);

    useEffect(() => () => window.clearTimeout(customTimer.current), []);

    const existing = useMemo(
        () =>
            Object.entries(existingColors ?? {}).map(([key, definition]) => ({
                key,
                fill: definition.browserValue,
                pmsValue:
                    definition.pmsValue ??
                    (showPms ? matchHexToPms(stripHash(definition.browserValue), PMS_MAX_DISTANCE)[0]?.pms : undefined),
            })),
        [existingColors, showPms],
    );

    const isSingleMode = !!singleColorOnly && existing.length === 1;
    const selected = useMemo(
        () => (isSingleMode ? existing : existing.filter((color) => selectedKeys.includes(color.key))),
        [existing, isSingleMode, selectedKeys],
    );
    const firstSelected = selected[0];

    const toggleSelection = useCallback((key: string) => {
        setCustomMode(false);
        setPmsOpen(false);
        setSelectedKeys((current) =>
            current.includes(key) ? current.filter((existingKey) => existingKey !== key) : [...current, key],
        );
    }, []);

    const applyToSelected = useCallback(
        (fill: string, pmsValue?: string) => selected.forEach((color) => onChange(color.key, fill, pmsValue)),
        [onChange, selected],
    );

    const handleReplacementSelect = useCallback(
        (color: ReplacementColor) => {
            if (isCustom(color)) {
                setCustomMode(true);
                if (firstSelected) setCustomHex(toHex(firstSelected.fill));
                return;
            }
            const value = replacementValue(color);
            if (!value) return;
            setCustomMode(false);
            applyToSelected(value, color.pmsValue || undefined);
        },
        [applyToSelected, firstSelected],
    );

    // Custom colors snap to the nearest PMS color, matching Beeline.
    const commitCustomColor = useCallback(
        (hex: string) => {
            const nearest = matchHexToPms(stripHash(hex), PMS_MAX_DISTANCE)[0];
            applyToSelected(nearest ? `#${nearest.hex}` : hex, nearest?.pms ?? "");
        },
        [applyToSelected],
    );

    const handleCustomColorChange = useCallback(
        (hex: string) => {
            setCustomHex(hex);
            if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
            window.clearTimeout(customTimer.current);
            customTimer.current = window.setTimeout(() => commitCustomColor(hex), CUSTOM_DEBOUNCE_MS);
        },
        [commitCustomColor],
    );

    const pmsResults = useMemo(() => {
        if (!pmsOpen || !firstSelected) return [];
        const query = pmsQuery.trim();
        return query
            ? findPmsColors(query, PMS_RESULT_LIMIT).map((result) => result.item)
            : matchHexToPms(stripHash(firstSelected.fill), PMS_MAX_DISTANCE);
    }, [firstSelected, pmsOpen, pmsQuery]);

    const handlePmsSelect = useCallback(
        (pms: string, hex: string) => {
            applyToSelected(`#${hex}`, pms);
            setPmsQuery("");
            setPmsOpen(false);
        },
        [applyToSelected],
    );

    const showGallery = useGallery ?? availableColors.some((color) => !!color.variant.thumbnail);
    const galleryEntries = useMemo(
        () =>
            availableColors.map((color) => ({
                color,
                variant: new Variant({
                    ...color.variant,
                    color: color.variant.color || replacementValue(color),
                    name: color.variant.name || color.variant.color || replacementValue(color) || "",
                    enabled: color.variant.enabled ?? true,
                    priceModifier: color.variant.priceModifier ?? 0,
                }),
            })),
        [availableColors],
    );
    const selectedReplacementValue = selected.length === 1 ? selected[0].fill.toLowerCase() : undefined;
    const isSelectedReplacement = (color: ReplacementColor) =>
        !!selectedReplacementValue && replacementValue(color)?.toLowerCase() === selectedReplacementValue;

    return (
        <>
            {!isSingleMode && existing.length > 0 && (
                <>
                    <Label variant="p">Colour channels</Label>
                    <SwatchRow>
                        {existing.map((color) => (
                            <Swatch
                                key={color.key}
                                $color={color.fill}
                                $selected={selectedKeys.includes(color.key)}
                                title={color.pmsValue}
                                onClick={() => toggleSelection(color.key)}
                            />
                        ))}
                    </SwatchRow>
                </>
            )}
            {selected.length > 0 && availableColors.length > 0 && (
                <>
                    {!isSingleMode && <Label variant="p">Select a replacement</Label>}
                    {showGallery ? (
                        <VariantGallery
                            variants={galleryEntries.map((entry) => entry.variant)}
                            selectedVariantId={galleryEntries
                                .find((entry) => isSelectedReplacement(entry.color))
                                ?.variant.getId()}
                            onSelect={(variant) => {
                                const entry = galleryEntries.find((e) => e.variant === variant);
                                if (entry) handleReplacementSelect(entry.color);
                            }}
                        />
                    ) : (
                        <SwatchRow>
                            {availableColors.map((color, index) => (
                                <Swatch
                                    key={color.variant.id || index}
                                    $color={swatchBackground(replacementValue(color), "#ccc")}
                                    $selected={isSelectedReplacement(color) || (isCustom(color) && customMode)}
                                    onClick={() => handleReplacementSelect(color)}
                                />
                            ))}
                        </SwatchRow>
                    )}
                    {customMode && (
                        <CustomColorPanel>
                            <ColorInput
                                type="color"
                                value={/^#[0-9a-f]{6}$/i.test(customHex) ? customHex : "#000000"}
                                onChange={(event) => handleCustomColorChange(event.target.value)}
                            />
                            <HexInput
                                type="text"
                                value={customHex}
                                $invalid={!/^#[0-9a-f]{6}$/i.test(customHex)}
                                onChange={(event) => handleCustomColorChange(event.target.value)}
                            />
                        </CustomColorPanel>
                    )}
                </>
            )}
            {showPms && existing.length > 0 && (
                <PmsSection>
                    <Label variant="p">
                        {selected.length === 0
                            ? "Select a color above to edit its PMS value"
                            : selected.length === 1
                              ? "Edit selected colour"
                              : "Edit selected colours"}
                    </Label>
                    <PmsInput
                        type="text"
                        disabled={selected.length === 0}
                        placeholder={firstSelected?.pmsValue ? `PMS ${firstSelected.pmsValue}` : "Search PMS colors"}
                        value={pmsQuery}
                        onChange={(event) => setPmsQuery(event.target.value)}
                        onFocus={() => setPmsOpen(true)}
                        onBlur={() => setPmsOpen(false)}
                    />
                    {pmsOpen && pmsResults.length > 0 && (
                        <PmsResults>
                            {pmsResults.map((result) => (
                                <PmsResult
                                    key={result.pms}
                                    // mousedown fires before the input's blur, which would close the list first.
                                    onMouseDown={(event) => {
                                        event.preventDefault();
                                        handlePmsSelect(result.pms, result.hex);
                                    }}
                                >
                                    <PmsChip $color={`#${result.hex}`} />
                                    {result.pms}
                                </PmsResult>
                            ))}
                        </PmsResults>
                    )}
                </PmsSection>
            )}
        </>
    );
};

export default SVGColorSelector;
