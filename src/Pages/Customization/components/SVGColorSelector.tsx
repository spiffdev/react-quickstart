import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Asset,
    browserColorToHex,
    ColorDefinition,
    findPmsColors,
    getTransformedAssetURL,
    matchHexToPms,
    Variant,
    VariantResource,
} from "@spiffcommerce/core";
import styled from "styled-components";
import Button from "../../../components/button";
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

interface MergeInfo {
    sourceIds: string[];
    targetId: string;
    targetColor: ColorDefinition;
    preMergeColors: { [key: string]: ColorDefinition };
    preMergeSvg: string;
}

interface Snapshot {
    colors: { [key: string]: { fill: string; pmsValue?: string } };
    merge?: MergeInfo;
}

interface History {
    states: Snapshot[];
    index: number;
}

const Label = styled(Typography)`
    margin: 8px 0;
    font-size: 12px;
    color: #4d4f5c;
`;

const ChannelRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
`;

const AssetPreview = styled.img`
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    object-fit: contain;
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
`;

const SwatchRow = styled.div`
    display: flex;
    flex: 1 1 0;
    flex-wrap: wrap;
    gap: 8px;
    min-width: 0;
    margin-bottom: 8px;
`;

const SwatchWrapper = styled.div`
    position: relative;
`;

const Swatch = styled.div<{ $color: string; $selected?: boolean }>`
    width: 36px;
    height: 36px;
    background: ${(props) => props.$color};
    border: 2px solid ${(props) => (props.$selected ? "var(--theme-primary-color)" : "#e0e0e0")};
    border-radius: 50%;
    cursor: pointer;
    box-sizing: border-box;
    transition: all 0.2s;

    &:hover {
        border-color: var(--theme-primary-color);
        transform: scale(1.1);
    }
`;

const DeleteButton = styled.button`
    position: absolute;
    top: -6px;
    right: -6px;
    width: 16px;
    height: 16px;
    padding: 0;
    font-size: 11px;
    line-height: 1;
    color: #fff;
    background: #757575;
    border: none;
    border-radius: 50%;
    cursor: pointer;

    &:hover {
        background: #d32f2f;
    }
`;

const AddSwatch = styled.button`
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    font-size: 18px;
    color: #757575;
    background: #fafafa;
    border: 2px dashed #bdbdbd;
    border-radius: 50%;
    cursor: pointer;

    &:hover {
        border-color: var(--theme-primary-color);
    }
`;

const Tag = styled.span`
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 500;
    color: #757575;
    white-space: nowrap;
`;

const CustomColorPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 12px 0;
`;

const CustomColorRow = styled.div`
    display: flex;
    gap: 8px;
`;

const ColorInput = styled.input`
    width: 100%;
    height: 40px;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
`;

const HexInput = styled.input<{ $invalid?: boolean }>`
    flex: 1 1 0;
    min-width: 0;
    padding: 8px 12px;
    font-size: 14px;
    border: 1px solid ${(props) => (props.$invalid ? "#d32f2f" : "#ccc")};
    border-radius: 4px;
    box-sizing: border-box;
`;

const EditSection = styled.div`
    position: relative;
    margin-top: 12px;
`;

const EditRow = styled.div<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    opacity: ${(props) => (props.$disabled ? 0.4 : 1)};
    pointer-events: ${(props) => (props.$disabled ? "none" : "auto")};
`;

const SelectedChips = styled.div`
    display: flex;
    gap: 4px;
`;

const Chip = styled.div<{ $color: string }>`
    width: 32px;
    height: 32px;
    background: ${(props) => props.$color};
    border: 1px solid #ddd;
    border-radius: 50%;
`;

const TextInput = styled.input`
    flex: 1 1 0;
    min-width: 0;
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

const PmsInputWrapper = styled.div`
    position: relative;
    flex: 1 1 0;
    min-width: 0;
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

const IconButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    padding: 0;
    background: #fff;
    border: 1px solid rgba(0, 0, 0, 0.23);
    border-radius: 4px;
    cursor: pointer;

    &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }
`;

const ActionRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 12px;
`;

const ActionGroup = styled.div`
    display: flex;
    gap: 8px;
`;

const HiddenColorInput = styled.input`
    display: none;
`;

type EyeDropperWindow = Window & { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } };

const stripHash = (color: string) => browserColorToHex(color).replace(/^#/, "");
const toHex = (color: string) => `#${stripHash(color)}`;
const replacementValue = (color: ReplacementColor) => color.fill ?? color.stroke ?? color.variant.color;
const isCustom = (color: ReplacementColor) => isCustomColor(replacementValue(color));
const isValidHex = (hex: string) => /^#[0-9a-f]{6}$/i.test(hex);

const averageColors = (colors: string[]) => {
    const channels = colors
        .map((color) => color.replace(/^#/, ""))
        .map((hex) => (hex.length === 3 ? hex.replace(/./g, "$&$&") : hex))
        .filter((hex) => /^[0-9a-f]{6}$/i.test(hex))
        .map((hex) => [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)));
    if (channels.length === 0) return "#000000";
    return `#${[0, 1, 2]
        .map((channel) =>
            Math.round(channels.reduce((total, rgb) => total + rgb[channel], 0) / channels.length)
                .toString(16)
                .padStart(2, "0"),
        )
        .join("")}`;
};

const EyeDropperButton: FunctionComponent<{ disabled?: boolean; onPick: (hex: string) => void }> = ({
    disabled,
    onPick,
}) => {
    const fallbackRef = useRef<HTMLInputElement>(null);

    const open = async () => {
        const EyeDropper = (window as EyeDropperWindow).EyeDropper;
        if (!EyeDropper) {
            // Browsers without the EyeDropper API fall back to the native color picker.
            fallbackRef.current?.click();
            return;
        }
        try {
            const result = await new EyeDropper().open();
            onPick(toHex(result.sRGBHex));
        } catch {
            // The customer cancelled picking a color.
        }
    };

    return (
        <>
            <IconButton type="button" title="Pick a color" disabled={disabled} onClick={open}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.71 5.63l-2.34-2.34a1 1 0 0 0-1.41 0l-3.12 3.12-1.93-1.91-1.41 1.41 1.42 1.42L3 16.25V21h4.75l8.92-8.92 1.42 1.42 1.41-1.41-1.92-1.92 3.12-3.12c.4-.4.4-1.03.01-1.42zM6.92 19L5 17.08l8.06-8.06 1.92 1.92L6.92 19z" />
                </svg>
            </IconButton>
            <HiddenColorInput ref={fallbackRef} type="color" onChange={(event) => onPick(event.currentTarget.value)} />
        </>
    );
};

const SVGColorSelector: FunctionComponent<{
    availableColors: ReplacementColor[];
    existingColors: { [key: string]: ColorDefinition } | undefined;
    onChange: (key: string, fill: string, pmsValue?: string) => void;
    showPms: boolean;
    /** When there is only one color to edit, skip straight to choosing its replacement. */
    singleColorOnly?: boolean;
    /** Forces the thumbnail gallery on or off; by default it's used when any color has a thumbnail. */
    useGallery?: boolean;
    /** When false the existing colors can be inspected but no replacement can be chosen. */
    isEditingColors?: boolean;
    onMergeColors?: (sourceIds: string[], targetId: string, targetColor: ColorDefinition) => void | Promise<void>;
    onUnmergeColors?: (
        sourceIds: string[],
        targetId: string,
        preMergeColors: { [key: string]: ColorDefinition },
        preMergeSvg: string,
    ) => void | Promise<void>;
    getCurrentSvg?: () => string | undefined;
    onDeleteColor?: (key: string) => void;
    onAddColor?: (color: ColorDefinition) => void;
    onColorHover?: (keys: string[]) => void;
    onSelectionChange?: (keys: string[]) => void;
    showEyeDropper?: boolean;
    showUndoRedo?: boolean;
    showColorName?: boolean;
    showAutoDetected?: boolean;
    currentAsset?: Asset;
}> = ({
    availableColors,
    existingColors,
    onChange,
    showPms,
    singleColorOnly,
    useGallery,
    isEditingColors = true,
    onMergeColors,
    onUnmergeColors,
    getCurrentSvg,
    onDeleteColor,
    onAddColor,
    onColorHover,
    onSelectionChange,
    showEyeDropper,
    showUndoRedo,
    showColorName,
    showAutoDetected,
    currentAsset,
}) => {
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [hoveredKey, setHoveredKey] = useState<string | undefined>(undefined);
    const [colorNames, setColorNames] = useState<Record<string, string>>({});
    const [customMode, setCustomMode] = useState(false);
    const [customHex, setCustomHex] = useState("#000000");
    const [pmsQuery, setPmsQuery] = useState("");
    const [pmsOpen, setPmsOpen] = useState(false);
    const [history, setHistory] = useState<History>({ states: [], index: -1 });
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
    const selectedIds = useMemo(() => selected.map((color) => color.key), [selected]);

    useEffect(() => {
        onColorHover?.(hoveredKey ? [hoveredKey] : []);
    }, [hoveredKey, onColorHover]);

    useEffect(() => {
        onSelectionChange?.(selectedIds);
    }, [onSelectionChange, selectedIds]);

    const currentSnapshot = useCallback(
        (): Snapshot => ({
            colors: Object.fromEntries(
                existing.map((color) => [color.key, { fill: color.fill, pmsValue: color.pmsValue }]),
            ),
        }),
        [existing],
    );

    // The first recorded change also records the state before it, so that it can be undone.
    const record = useCallback((before: Snapshot, after: Snapshot) => {
        setHistory((current) => {
            const base = current.states.length === 0 ? [before] : current.states.slice(0, current.index + 1);
            return { states: [...base, after], index: base.length };
        });
    }, []);

    const resetHistory = useCallback(() => setHistory({ states: [], index: -1 }), []);

    const applyToSelected = useCallback(
        (fill: string, pmsValue?: string) => {
            if (showUndoRedo) {
                const before = currentSnapshot();
                const after: Snapshot = { colors: { ...before.colors } };
                selected.forEach((color) => (after.colors[color.key] = { fill, pmsValue }));
                record(before, after);
            }
            selected.forEach((color) => onChange(color.key, fill, pmsValue));
        },
        [currentSnapshot, onChange, record, selected, showUndoRedo],
    );

    const toggleSelection = useCallback((key: string) => {
        setCustomMode(false);
        setPmsOpen(false);
        setSelectedKeys((current) =>
            current.includes(key) ? current.filter((existingKey) => existingKey !== key) : [...current, key],
        );
    }, []);

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
            if (!isValidHex(hex)) return;
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

    const handleEyeDropperPick = useCallback(
        (hex: string) => {
            const nearest = matchHexToPms(stripHash(hex), PMS_MAX_DISTANCE)[0];
            applyToSelected(nearest ? `#${nearest.hex}` : hex, nearest?.pms ?? "");
        },
        [applyToSelected],
    );

    const handleMerge = useCallback(() => {
        if (!onMergeColors || selected.length < 2) return;

        const preMergeSvg = getCurrentSvg?.();
        if (!preMergeSvg) {
            console.error("Cannot merge colors: the current SVG is unavailable");
            return;
        }

        const averaged = averageColors(selected.map((color) => toHex(color.fill)));
        const nearest = matchHexToPms(stripHash(averaged), PMS_MAX_DISTANCE)[0];
        const targetColor: ColorDefinition = {
            browserValue: nearest ? `#${nearest.hex}` : averaged,
            pmsValue: nearest?.pms ?? "",
        };
        const sourceIds = selected.map((color) => color.key);
        const targetId = sourceIds[0];

        const before = currentSnapshot();
        const mergedColors = { ...before.colors };
        sourceIds.slice(1).forEach((id) => delete mergedColors[id]);
        mergedColors[targetId] = { fill: targetColor.browserValue, pmsValue: targetColor.pmsValue };
        record(before, {
            colors: mergedColors,
            merge: { sourceIds, targetId, targetColor, preMergeColors: { ...existingColors }, preMergeSvg },
        });

        onMergeColors(sourceIds, targetId, targetColor);
        setSelectedKeys([]);
    }, [currentSnapshot, existingColors, getCurrentSvg, onMergeColors, record, selected]);

    // Only colors that still exist can be restored; merges are handled separately.
    const restoreSnapshot = useCallback(
        (snapshot: Snapshot) => {
            Object.entries(snapshot.colors).forEach(([key, value]) => {
                const current = existing.find((color) => color.key === key);
                if (current && (current.fill !== value.fill || current.pmsValue !== value.pmsValue)) {
                    onChange(key, value.fill, value.pmsValue);
                }
            });
        },
        [existing, onChange],
    );

    const handleUndo = useCallback(() => {
        if (history.index <= 0) return;
        const current = history.states[history.index];
        if (current.merge && onUnmergeColors) {
            const { sourceIds, targetId, preMergeColors, preMergeSvg } = current.merge;
            onUnmergeColors(sourceIds, targetId, preMergeColors, preMergeSvg);
        } else {
            restoreSnapshot(history.states[history.index - 1]);
        }
        setSelectedKeys([]);
        setHistory({ ...history, index: history.index - 1 });
    }, [history, onUnmergeColors, restoreSnapshot]);

    const handleRedo = useCallback(() => {
        if (history.index >= history.states.length - 1) return;
        const next = history.states[history.index + 1];
        if (next.merge && onMergeColors) {
            onMergeColors(next.merge.sourceIds, next.merge.targetId, next.merge.targetColor);
        } else {
            restoreSnapshot(next);
        }
        setSelectedKeys([]);
        setHistory({ ...history, index: history.index + 1 });
    }, [history, onMergeColors, restoreSnapshot]);

    const handleAddColor = useCallback(() => {
        onAddColor?.({ browserValue: "#FFFFFF", pmsValue: undefined });
        resetHistory();
    }, [onAddColor, resetHistory]);

    const handleDeleteColor = useCallback(
        (key: string) => {
            setSelectedKeys((current) => current.filter((selectedKey) => selectedKey !== key));
            onDeleteColor?.(key);
            resetHistory();
        },
        [onDeleteColor, resetHistory],
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
    const assetPreviewUrl = currentAsset ? getTransformedAssetURL(currentAsset, 80, "webp") : undefined;
    const hasActions = existing.length > 0 && (!!onMergeColors || !!showUndoRedo);
    const showEditSection = existing.length > 0 && (showPms || showColorName);

    return (
        <>
            {!isSingleMode && existing.length > 0 && (
                <>
                    <Label variant="p">Colour channels</Label>
                    <ChannelRow>
                        {assetPreviewUrl && <AssetPreview src={assetPreviewUrl} alt="Asset preview" />}
                        <SwatchRow>
                            {existing.map((color) => (
                                <SwatchWrapper
                                    key={color.key}
                                    onMouseEnter={() => setHoveredKey(color.key)}
                                    onMouseLeave={() => setHoveredKey(undefined)}
                                >
                                    <Swatch
                                        $color={color.fill}
                                        $selected={selectedKeys.includes(color.key)}
                                        title={colorNames[color.key] || color.pmsValue}
                                        onClick={() => toggleSelection(color.key)}
                                    />
                                    {onDeleteColor && (
                                        <DeleteButton
                                            type="button"
                                            aria-label="Delete color"
                                            onClick={() => handleDeleteColor(color.key)}
                                        >
                                            ×
                                        </DeleteButton>
                                    )}
                                </SwatchWrapper>
                            ))}
                            {onAddColor && (
                                <AddSwatch type="button" aria-label="Add color" onClick={handleAddColor}>
                                    +
                                </AddSwatch>
                            )}
                        </SwatchRow>
                        {(showAutoDetected !== undefined || isEditingColors) && (
                            <Tag>{showAutoDetected ? "Auto Detected" : "Editable"}</Tag>
                        )}
                    </ChannelRow>
                </>
            )}
            {showEditSection && (
                <EditSection>
                    <Label variant="p">
                        {selected.length === 0
                            ? "Select a color above to edit"
                            : selected.length === 1
                              ? "Edit selected colour"
                              : "Edit selected colours"}
                    </Label>
                    {showPms && (
                        <EditRow $disabled={selected.length === 0}>
                            <SelectedChips>
                                {selected.length > 0 ? (
                                    selected.map((color) => <Chip key={color.key} $color={color.fill} />)
                                ) : (
                                    <Chip $color="#e0e0e0" />
                                )}
                            </SelectedChips>
                            <PmsInputWrapper>
                                <TextInput
                                    type="text"
                                    disabled={selected.length === 0}
                                    placeholder={
                                        firstSelected?.pmsValue ? `PMS ${firstSelected.pmsValue}` : "Search PMS colors"
                                    }
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
                            </PmsInputWrapper>
                            {showEyeDropper && (
                                <EyeDropperButton disabled={selected.length === 0} onPick={handleEyeDropperPick} />
                            )}
                        </EditRow>
                    )}
                    {showColorName && (
                        <EditRow $disabled={selected.length !== 1} style={{ marginTop: 8 }}>
                            <TextInput
                                type="text"
                                disabled={selected.length !== 1}
                                placeholder="Where does this color appear? e.g. Background, Text... (optional)"
                                value={firstSelected ? (colorNames[firstSelected.key] ?? "") : ""}
                                onChange={(event) => {
                                    const name = event.target.value;
                                    if (firstSelected) {
                                        setColorNames((names) => ({ ...names, [firstSelected.key]: name }));
                                    }
                                }}
                            />
                        </EditRow>
                    )}
                </EditSection>
            )}
            {hasActions && (
                <ActionRow>
                    <ActionGroup>
                        {onMergeColors && existing.length > 1 && (
                            <Button type="button" disabled={selected.length < 2} onClick={handleMerge}>
                                Merge{selected.length > 1 ? ` (${selected.length})` : ""}
                            </Button>
                        )}
                    </ActionGroup>
                    {showUndoRedo && (
                        <ActionGroup>
                            <Button type="button" disabled={history.index <= 0} onClick={handleUndo}>
                                Undo
                            </Button>
                            <Button
                                type="button"
                                disabled={history.index >= history.states.length - 1}
                                onClick={handleRedo}
                            >
                                Redo
                            </Button>
                        </ActionGroup>
                    )}
                </ActionRow>
            )}
            {selected.length > 0 && isEditingColors && availableColors.length > 0 && (
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
                                value={isValidHex(customHex) ? customHex : "#000000"}
                                onChange={(event) => handleCustomColorChange(event.target.value)}
                            />
                            <CustomColorRow>
                                <HexInput
                                    type="text"
                                    value={customHex}
                                    $invalid={!isValidHex(customHex)}
                                    onChange={(event) => handleCustomColorChange(event.target.value)}
                                />
                                {showEyeDropper && <EyeDropperButton onPick={handleCustomColorChange} />}
                            </CustomColorRow>
                        </CustomColorPanel>
                    )}
                </>
            )}
        </>
    );
};

export default SVGColorSelector;
