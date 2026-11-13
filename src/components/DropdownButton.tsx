import {
    autoUpdate,
    flip,
    FloatingPortal,
    offset,
    shift,
    size,
    useClick,
    useDismiss,
    useFloating,
    useInteractions,
    useRole,
} from "@floating-ui/react";
import { ChevronDown } from "lucide-react";
import { FunctionComponent, ReactNode, useState } from "react";
import styled from "styled-components";
import Button from "./button";

const Menu = styled.div`
    z-index: 1300;
    box-sizing: border-box;
    max-height: 300px;
    overflow-y: auto;
    padding: 4px;
    background-color: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 5px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
`;

const MenuItem = styled.button`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 10px 12px;
    font: inherit;
    font-size: 14px;
    text-align: left;
    color: inherit;
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:hover,
    &:focus-visible {
        background-color: #f0f0f0;
    }
`;

export type DropdownItem = {
    id: string;
    label: string;
    /** Shown after the label, such as a price. */
    detail?: ReactNode;
};

/**
 * A button which offers a menu of choices when pressed.
 */
const DropdownButton: FunctionComponent<{
    label: ReactNode;
    items: DropdownItem[];
    onSelect: (id: string) => void;
    disabled?: boolean;
    fullWidth?: boolean;
}> = ({ label, items, onSelect, disabled, fullWidth }) => {
    const [open, setOpen] = useState(false);
    const { refs, floatingStyles, context } = useFloating({
        open,
        onOpenChange: setOpen,
        placement: "bottom-start",
        strategy: "fixed",
        middleware: [
            offset(4),
            flip(),
            shift({ padding: 8 }),
            // The menu is at least as wide as the button.
            size({
                apply({ rects, elements }) {
                    elements.floating.style.minWidth = `${rects.reference.width}px`;
                },
            }),
        ],
        whileElementsMounted: autoUpdate,
    });
    const { getReferenceProps, getFloatingProps } = useInteractions([
        useClick(context),
        useDismiss(context),
        useRole(context, { role: "menu" }),
    ]);

    return (
        <>
            <Button
                ref={refs.setReference}
                fullWidth={fullWidth}
                disabled={disabled}
                icon={<ChevronDown size={18} aria-hidden="true" />}
                {...getReferenceProps()}
            >
                {label}
            </Button>
            {open && (
                <FloatingPortal>
                    <Menu ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
                        {items.map((item) => (
                            <MenuItem
                                key={item.id}
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setOpen(false);
                                    onSelect(item.id);
                                }}
                            >
                                <span>{item.label}</span>
                                {item.detail}
                            </MenuItem>
                        ))}
                    </Menu>
                </FloatingPortal>
            )}
        </>
    );
};

export default DropdownButton;
