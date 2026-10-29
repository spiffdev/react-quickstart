import {
    autoUpdate,
    flip,
    FloatingPortal,
    offset,
    shift,
    useDismiss,
    useFloating,
    useInteractions,
    useRole,
} from "@floating-ui/react";
import { FunctionComponent, useCallback, useState } from "react";
import styled from "styled-components";

// Help text starting with this prefix points at a page in the support documentation instead of being shown directly.
const HELP_LINK_PREFIX = "help:";
const SUPPORT_DOCS_URL = "https://support.spiffcommerce.com/docs";
const POPOVER_MAX_WIDTH = 350;
const POPOVER_OFFSET = 4;
const VIEWPORT_PADDING = 8;

const HelpButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;

    svg {
        fill: #b0bec5;
        transition: fill 0.2s;
    }

    &:hover svg,
    &:focus-visible svg {
        fill: #78909c;
    }
`;

const Popover = styled.div`
    z-index: 1300;
    box-sizing: border-box;
    width: max-content;
    max-width: min(${POPOVER_MAX_WIDTH}px, calc(100vw - ${VIEWPORT_PADDING * 2}px));
    padding: 8px 12px;
    font-size: 14px;
    white-space: pre-line;
    background-color: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
`;

const StepHelp: FunctionComponent<{ helpText: string }> = ({ helpText }) => {
    const [open, setOpen] = useState(false);
    const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
    const isLink = helpText.startsWith(HELP_LINK_PREFIX);

    const { refs, floatingStyles, context } = useFloating({
        open,
        onOpenChange: setOpen,
        placement: "bottom",
        middleware: [offset(POPOVER_OFFSET), flip(), shift({ padding: VIEWPORT_PADDING })],
        whileElementsMounted: autoUpdate,
    });
    const { getReferenceProps, getFloatingProps } = useInteractions([
        useDismiss(context),
        useRole(context, { role: "dialog" }),
    ]);

    const handleClick = useCallback(() => {
        if (isLink) {
            window.open(
                `${SUPPORT_DOCS_URL}${helpText.slice(HELP_LINK_PREFIX.length)}`,
                "_blank",
                "noopener,noreferrer",
            );
            return;
        }
        // Render inside the theme's root so it picks up the same styles as the rest of the theme.
        setPortalRoot(refs.domReference.current?.closest<HTMLElement>(".app-body") ?? null);
        setOpen((current) => !current);
    }, [helpText, isLink, refs.domReference]);

    return (
        <>
            <HelpButton
                ref={refs.setReference}
                type="button"
                aria-label="Help"
                title={isLink ? "Opens help in a new tab" : undefined}
                {...getReferenceProps({ onClick: handleClick })}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
            </HelpButton>
            {open && (
                <FloatingPortal root={portalRoot}>
                    <Popover ref={refs.setFloating} style={floatingStyles} aria-label="Help" {...getFloatingProps()}>
                        {helpText}
                    </Popover>
                </FloatingPortal>
            )}
        </>
    );
};

export default StepHelp;
