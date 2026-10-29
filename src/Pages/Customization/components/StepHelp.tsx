import { FunctionComponent, useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";

// Help text starting with this prefix points at a page in the support documentation instead of being shown directly.
const HELP_LINK_PREFIX = "help:";
const SUPPORT_DOCS_URL = "https://support.spiffcommerce.com/docs";
const POPOVER_MAX_WIDTH = 350;
const VIEWPORT_MARGIN = 8;

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

// Fixed positioning keeps the popover from being clipped by the scrolling steps column.
const Popover = styled.div<{ $top: number; $left: number }>`
    position: fixed;
    top: ${(props) => props.$top}px;
    left: ${(props) => props.$left}px;
    z-index: 1300;
    box-sizing: border-box;
    width: max-content;
    max-width: ${POPOVER_MAX_WIDTH}px;
    padding: 8px 12px;
    font-size: 14px;
    white-space: pre-line;
    background-color: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
`;

const StepHelp: FunctionComponent<{ helpText: string }> = ({ helpText }) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number } | undefined>(undefined);
    const isOpen = !!position;
    const isLink = helpText.startsWith(HELP_LINK_PREFIX);

    const close = useCallback(() => setPosition(undefined), []);

    const handleClick = useCallback(() => {
        if (isLink) {
            window.open(
                `${SUPPORT_DOCS_URL}${helpText.slice(HELP_LINK_PREFIX.length)}`,
                "_blank",
                "noopener,noreferrer",
            );
            return;
        }
        if (isOpen || !buttonRef.current) {
            close();
            return;
        }

        const rect = buttonRef.current.getBoundingClientRect();
        const width = Math.min(POPOVER_MAX_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
        const centered = rect.left + rect.width / 2 - width / 2;
        setPosition({
            top: rect.bottom + 4,
            left: Math.min(Math.max(centered, VIEWPORT_MARGIN), window.innerWidth - width - VIEWPORT_MARGIN),
        });
    }, [close, helpText, isLink, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const closeOnOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!popoverRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
                close();
            }
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") close();
        };

        document.addEventListener("mousedown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);
        // The popover is fixed to the viewport, so it would drift away from its button.
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
            document.removeEventListener("mousedown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, [close, isOpen]);

    return (
        <>
            <HelpButton
                ref={buttonRef}
                type="button"
                aria-label="Help"
                aria-expanded={isLink ? undefined : isOpen}
                title={isLink ? "Opens help in a new tab" : undefined}
                onClick={handleClick}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
            </HelpButton>
            {position && (
                <Popover ref={popoverRef} role="dialog" aria-label="Help" $top={position.top} $left={position.left}>
                    {helpText}
                </Popover>
            )}
        </>
    );
};

export default StepHelp;
