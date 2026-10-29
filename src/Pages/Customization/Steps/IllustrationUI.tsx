import { FunctionComponent, useCallback, useEffect, useState } from "react";
import {
    AddonHandle,
    ColorDefinition,
    ColorPickerDisplayType,
    IllustrationStepHandle,
    Variant,
    WorkflowManager,
} from "@spiffcommerce/core";
import styled from "styled-components";
import Typography from "../../../components/typography";
import SVGColorSelector, { ReplacementColor } from "../components/SVGColorSelector";
import VariantGallery from "../components/VariantGallery";

const Container = styled.div`
    padding: 16px;
    box-sizing: border-box;
    width: 100%;
`;

const ColorPickerSection = styled.div`
    margin-top: 16px;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 8px;
`;

const ColorPickerTitle = styled(Typography)`
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
`;

const IllustrationUI: FunctionComponent<{
    step: IllustrationStepHandle;
    workflowManager: WorkflowManager;
    onActivation?: () => void;
}> = ({ step, workflowManager, onActivation }) => {
    const [variants, setVariants] = useState<Variant[]>([]);
    const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(() =>
        step.getCurrentVariant()?.getId(),
    );
    const [availableColors, setAvailableColors] = useState<ReplacementColor[]>([]);
    const [existingColors, setExistingColors] = useState<{ [key: string]: ColorDefinition } | undefined>(() =>
        step.getColors(),
    );
    const [canUsePmsColors, setCanUsePmsColors] = useState(false);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [allVariants, colors] = await Promise.all([step.getAllVariants(), step.getAvailableColors()]);
                setVariants(allVariants || []);
                setAvailableColors(colors || []);
            } catch (error) {
                console.error("Error loading illustration step:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [step]);

    useEffect(() => {
        workflowManager
            .getClient()
            .canUseAddon(AddonHandle.AdvancedImageManipulation)
            .then(setCanUsePmsColors)
            .catch(() => setCanUsePmsColors(false));
    }, [workflowManager]);

    const handleVariantSelect = useCallback(
        async (variant: Variant) => {
            if (updating) return;

            setSelectedVariantId(variant.getId());
            setUpdating(true);
            onActivation?.();

            try {
                await step.selectVariant(variant);
                setExistingColors(step.getColors());
            } catch (error) {
                console.error("Error selecting illustration variant:", error);
            } finally {
                setUpdating(false);
            }
        },
        [updating, onActivation, step],
    );

    const handleColorChange = useCallback(
        async (key: string, fill: string, pmsValue?: string) => {
            onActivation?.();

            try {
                await step.setColor(key, fill, pmsValue);
                setExistingColors(step.getColors());
            } catch (error) {
                console.error("Error setting illustration color:", error);
            }
        },
        [onActivation, step],
    );

    if (loading) {
        return <Container data-test-step-type="illustration">Loading...</Container>;
    }

    const showPms = step.isPMSPickerEnabled() && canUsePmsColors;
    const displayType = step.getColorPickerDisplayType();
    const hasExistingColors = Object.keys(existingColors ?? {}).length > 0;
    const showColorPicker = step.isColorPickerEnabled() && hasExistingColors && (availableColors.length > 0 || showPms);

    return (
        <Container data-test-step-type="illustration">
            {variants.length > 1 && (
                <VariantGallery
                    variants={variants}
                    selectedVariantId={selectedVariantId}
                    disabled={updating}
                    searchEnabled={step.isVariantSearchEnabled()}
                    categoriesEnabled={step.isVariantCategoriesEnabled()}
                    onSelect={handleVariantSelect}
                />
            )}
            {showColorPicker && (
                <ColorPickerSection>
                    <ColorPickerTitle variant="h3">Color Options</ColorPickerTitle>
                    <SVGColorSelector
                        availableColors={availableColors}
                        existingColors={existingColors}
                        onChange={handleColorChange}
                        showPms={showPms}
                        singleColorOnly
                        useGallery={displayType ? displayType === ColorPickerDisplayType.Large : undefined}
                    />
                </ColorPickerSection>
            )}
        </Container>
    );
};

export default IllustrationUI;
