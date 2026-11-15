import { ChangeEvent, FunctionComponent, useCallback, useEffect, useMemo, useState } from "react";
import {
    ColorOptionGlobalPropertyHandle,
    FileUploadGlobalPropertyHandle,
    GlobalPropertyHandle,
    OptionGlobalPropertyHandle,
    TextGlobalPropertyHandle,
    Variant,
} from "@spiffcommerce/core";
import styled from "styled-components";
import useDebounce from "../../hooks/useDebounce";
import VariantGallery from "../Customization/components/VariantGallery";
import { isCustomColor } from "../Customization/components/customColor";
import FileUploadProperty from "./FileUploadProperty";

const TEXT_DEBOUNCE_MS = 400;

const Body = styled.div`
    margin-top: 8px;
`;

const TextField = styled.input`
    width: 100%;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 16px;
    font-family: inherit;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: var(--theme-primary-color);
    }
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

const TextProperty: FunctionComponent<{ handle: TextGlobalPropertyHandle }> = ({ handle }) => {
    const [text, setText] = useState(() => handle.getText());
    const debounced = useDebounce(text, TEXT_DEBOUNCE_MS);
    useEffect(() => {
        if (debounced === handle.getText()) return;
        handle.setText(debounced).catch((error) => console.error("Error setting shared text:", error));
    }, [debounced, handle]);

    return (
        <Body>
            <TextField
                type="text"
                value={text}
                aria-label={handle.getTitle()}
                onChange={(event) => setText(event.target.value)}
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
