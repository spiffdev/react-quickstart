import { ChangeEvent, FunctionComponent, useCallback, useEffect, useMemo, useState } from "react";
import {
    AspectType,
    Bundle,
    ColorOptionGlobalPropertyHandle,
    FileUploadGlobalPropertyHandle,
    GlobalPropertyHandle,
    OptionGlobalPropertyHandle,
    TextGlobalPropertyHandle,
    TextStepHandle,
    Variant,
} from "@spiffcommerce/core";
import styled from "styled-components";
import useBundle from "../../hooks/useBundle";
import useDebounce from "../../hooks/useDebounce";
import TemplateTextField from "../Customization/components/TemplateTextField";
import { errorMessage, remainingText } from "../Customization/Steps/TextUI";
import VariantGallery from "../Customization/components/VariantGallery";
import { isCustomColor } from "../Customization/components/customColor";
import FileUploadProperty from "./FileUploadProperty";

const TEXT_DEBOUNCE_MS = 400;

const Body = styled.div`
    margin-top: 8px;
`;

const ColorInput = styled.input`
    width: 100%;
    height: 44px;
    margin-top: 12px;
    padding: 0;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: none;
    cursor: pointer;
`;

/** The text steps which take their text from this shared property, and aren't overriding it. */
const sharedTextSteps = (bundle: Bundle, handle: TextGlobalPropertyHandle) => {
    const configurationId = bundle.getGlobalPropertyConfiguration()?.id;
    return bundle
        .getWorkflowExperiences()
        .flatMap((experience) => experience.getSteps())
        .filter(
            (step): step is TextStepHandle =>
                step instanceof TextStepHandle &&
                !step.getOverrideGlobalPropertyConfiguration(AspectType.Text) &&
                !!step
                    .getRaw()
                    .globalPropertyAspectConfigurations?.some(
                        (aspect) =>
                            aspect.globalPropertyConfigurationId === configurationId &&
                            aspect.aspectName === handle.getName(),
                    ),
        );
};

const TextProperty: FunctionComponent<{ handle: TextGlobalPropertyHandle }> = ({ handle }) => {
    const bundle = useBundle();
    const [text, setText] = useState(() => handle.getText());
    // The steps decide what text is acceptable, so their verdicts are what the customer is shown.
    const [helperText, setHelperText] = useState<string | undefined>(undefined);
    const [error, setError] = useState(false);
    const steps = useMemo(() => sharedTextSteps(bundle, handle), [bundle, handle]);
    const multiline = steps.some((step) => step.newLinesSupported());

    // Applies the text to the steps as it's typed, as a text step does, and reports what they make of it. Text which
    // isn't acceptable is neither shown on the design nor kept, so the design always holds acceptable text.
    const change = (value: string) => {
        setText(value);
        const results = steps.map((step) => step.setText(value));
        const message = results.map(errorMessage).find((found) => !!found);
        const remaining = results
            .map((result) => result.helperData.charactersRemaining)
            .filter((count): count is number => count !== undefined);
        setError(!!message);
        setHelperText(message ?? (remaining.length > 0 ? remainingText(Math.min(...remaining)) : undefined));
        return !message;
    };

    const [accepted, setAccepted] = useState(text);
    const debounced = useDebounce(accepted, TEXT_DEBOUNCE_MS);
    useEffect(() => {
        if (debounced === handle.getText()) return;
        handle.setText(debounced).catch((saveError) => console.error("Error setting shared text:", saveError));
    }, [debounced, handle]);

    const typeText = (value: string) => {
        if (change(value)) setAccepted(value);
    };

    // The fields are filled in from the first design, as core does for the property.
    const workflowManager = bundle.getWorkflowExperiences()[0]?.getWorkflowManager();
    const templatingKeys = handle.isTemplatingEnabled() ? handle.getTemplatingKeys() : [];

    return (
        <Body>
            <TemplateTextField
                value={text}
                onChange={typeText}
                multiline={multiline}
                keys={templatingKeys}
                workflowManager={workflowManager}
                ariaLabel={handle.getTitle()}
                error={error}
                helperText={helperText}
            />
        </Body>
    );
};

const OptionProperty: FunctionComponent<{ handle: OptionGlobalPropertyHandle }> = ({ handle }) => {
    const [variants, setVariants] = useState<Variant[] | undefined>(undefined);
    const [selected, setSelected] = useState<Variant | undefined>(() => handle.getCurrentVariant());
    const [updating, setUpdating] = useState(false);
    const [customColor, setCustomColor] = useState(() =>
        handle instanceof ColorOptionGlobalPropertyHandle ? handle.getCustomColor() : "",
    );

    useEffect(() => {
        let canceled = false;
        handle
            .getAvailableVariants()
            .then((available) => !canceled && setVariants(available))
            .catch((error) => {
                console.error("Error loading shared options:", error);
                if (!canceled) setVariants([]);
            });
        return () => {
            canceled = true;
        };
    }, [handle]);

    const select = useCallback(
        async (variant: Variant) => {
            if (updating) return;
            setSelected(variant);
            setUpdating(true);
            try {
                await handle.selectVariant(variant);
                setSelected(handle.getCurrentVariant());
            } catch (error) {
                console.error("Error selecting a shared option:", error);
                setSelected(handle.getCurrentVariant());
            } finally {
                setUpdating(false);
            }
        },
        [handle, updating],
    );

    const changeCustomColor = (event: ChangeEvent<HTMLInputElement>) => {
        if (!(handle instanceof ColorOptionGlobalPropertyHandle)) return;
        setCustomColor(event.target.value);
        handle.setCustomColor(event.target.value).catch((error) => console.error("Error setting the color:", error));
    };

    if (!variants) return <Body>Loading...</Body>;
    if (variants.length === 0) return null;
    return (
        <Body>
            <VariantGallery
                variants={variants}
                selectedVariantId={selected?.getId()}
                disabled={updating}
                searchEnabled
                categoriesEnabled
                onSelect={select}
            />
            {handle instanceof ColorOptionGlobalPropertyHandle && isCustomColor(selected?.getColor()) && (
                <ColorInput type="color" value={customColor} onChange={changeCustomColor} />
            )}
        </Body>
    );
};

/** The control for a global property, chosen by the kind of property it is. */
export const PropertyControl: FunctionComponent<{ handle: GlobalPropertyHandle }> = ({ handle }) => {
    return useMemo(() => {
        if (handle instanceof TextGlobalPropertyHandle) return <TextProperty handle={handle} />;
        if (handle instanceof FileUploadGlobalPropertyHandle) return <FileUploadProperty handle={handle} />;
        if (handle instanceof OptionGlobalPropertyHandle) return <OptionProperty handle={handle} />;
        return null;
    }, [handle]);
};
