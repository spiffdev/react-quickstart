import { FunctionComponent, ReactNode, useEffect, useRef } from "react";
import { Check, ChevronLeft } from "lucide-react";
import styled, { css } from "styled-components";
import { MEDIA } from "../../layout";
import { useLayoutMode } from "../../hooks/useLayout";

type StepState = "complete" | "current" | "upcoming";

const ACTIVE_COLOR = "var(--theme-primary-color)";
const INACTIVE_COLOR = "#e0e0e0";
const CONNECTOR_DURATION = "0.35s";
const MARKER_DURATION = "0.3s";

// Everything animates through transitions, so it only moves when a step's state changes (not on first load).
const reducedMotion = css`
    @media (prefers-reduced-motion: reduce) {
        transition: none;
    }
`;

const Nav = styled.nav`
    display: flex;
    align-items: center;
    flex: none;
    border-bottom: 1px solid #e0e0e0;
    background-color: #fff;
`;

const List = styled.ol`
    display: flex;
    flex: 1 1 0;
    min-width: 0;
    align-items: center;
    margin: 0;
    padding: 12px 16px;
    list-style: none;
    /* When the steps don't fit they scroll, and the current one is kept in the middle. */
    position: relative;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;

    &::-webkit-scrollbar {
        display: none;
    }

    @media ${MEDIA.compact} {
        padding: 12px;
    }
`;

// Separates the steps from the actions beside them.
const Divider = styled.div`
    flex: none;
    align-self: stretch;
    width: 1px;
    background-color: #9e9e9e;
`;

const Actions = styled.div`
    display: flex;
    flex: none;
    align-items: center;
    padding: 0 16px;

    @media ${MEDIA.compact} {
        padding: 0 12px;
    }
`;

const Item = styled.li<{ $complete: boolean }>`
    display: flex;
    align-items: center;
    flex: none;

    &:not(:last-child) {
        flex: 1 1 0;
    }

    /* The connector leading to the next step, which fills in as that step is reached. */
    &:not(:last-child)::after {
        content: "";
        flex: 1 1 0;
        min-width: 16px;
        height: 2px;
        margin: 0 12px;

        @media ${MEDIA.compact} {
            margin: 0 8px;
        }
        background:
            linear-gradient(${ACTIVE_COLOR}, ${ACTIVE_COLOR}) left center / ${(props) => (props.$complete ? 100 : 0)}%
                100% no-repeat,
            ${INACTIVE_COLOR};
        transition: background-size ${CONNECTOR_DURATION} ease-in-out;
        ${reducedMotion}
    }
`;

// Every step is a button, disabled when it can't be visited, so the markup (and its transitions) stay stable.
const StepButton = styled.button`
    display: inline-flex;
    align-items: center;
    padding: 0;
    font: inherit;
    background: none;
    border: none;
    cursor: pointer;

    &:disabled {
        cursor: default;
    }

    &:not(:disabled):hover span:last-child {
        text-decoration: underline;
    }

    &:focus-visible {
        outline: 2px solid ${ACTIVE_COLOR};
        outline-offset: 4px;
        border-radius: 4px;
    }
`;

const Marker = styled.span<{ $state: StepState; $available: boolean }>`
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 28px;
    height: 28px;
    box-sizing: border-box;
    font-size: 13px;
    font-weight: 600;
    border-radius: 50%;
    border: 2px solid
        ${(props) => (props.$state !== "upcoming" ? ACTIVE_COLOR : props.$available ? "var(--theme-primary-color-light)" : "#bdbdbd")};
    color: ${(props) =>
        props.$state === "complete"
            ? "var(--theme-primary-contrast-color)"
            : props.$state === "current" || props.$available
              ? ACTIVE_COLOR
              : "#9e9e9e"};
    background-color: ${(props) => (props.$state === "complete" ? ACTIVE_COLOR : "#fff")};
    box-shadow: 0 0 0 ${(props) => (props.$state === "current" ? 4 : 0)}px var(--theme-primary-color-halo);
    transition:
        border-color ${MARKER_DURATION} ease,
        color ${MARKER_DURATION} ease,
        background-color ${MARKER_DURATION} ease,
        box-shadow ${MARKER_DURATION} ease;
    /* Wait for the connector to reach the marker before it lights up. */
    transition-delay: ${(props) => (props.$state === "current" ? CONNECTOR_DURATION : "0s")};
    ${reducedMotion}
`;

// The number and the check mark share the marker and swap places with a scale and fade.
const MarkerSymbol = styled.span<{ $visible: boolean }>`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: ${(props) => (props.$visible ? 1 : 0)};
    transform: scale(${(props) => (props.$visible ? 1 : 0.4)});
    transition:
        opacity ${MARKER_DURATION} ease,
        transform ${MARKER_DURATION} cubic-bezier(0.34, 1.56, 0.64, 1);
    ${reducedMotion}
`;

const Label = styled.span<{ $state: StepState; $available: boolean }>`
    margin-left: 8px;
    font-size: 14px;
    font-weight: ${(props) => (props.$state === "current" ? 600 : 400)};
    white-space: nowrap;
    color: ${(props) => (props.$state === "upcoming" ? (props.$available ? ACTIVE_COLOR : "#9e9e9e") : "var(--theme-text-color)")};
    transition: color ${MARKER_DURATION} ease;
    transition-delay: ${(props) => (props.$state === "current" ? CONNECTOR_DURATION : "0s")};
    ${reducedMotion}

    /* Only the current page keeps its label on narrow screens, so the markers fit. */
    @media ${MEDIA.compact} {
        ${(props) => props.$state !== "current" && "display: none;"}
    }
`;

// Phones in landscape have no height to spare, so the steps collapse to a single line.
const CompactProgress = styled.div`
    display: flex;
    align-items: center;
    flex: 1 1 0;
    min-width: 0;
    gap: 8px;
    padding: 4px 12px;
    font-size: 14px;
`;

const CompactLabel = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

/**
 * Shows the customer how far through the pages they are.
 */
const PageStepper: FunctionComponent<{
    steps: string[];
    currentIndex: number;
    /** Which steps the customer can go to. */
    enabledSteps: boolean[];
    onStepSelected: (index: number) => void;
    /** Shown beside the steps, after a divider. */
    actions?: ReactNode;
}> = ({ steps, currentIndex, enabledSteps, onStepSelected, actions }) => {
    const { short } = useLayoutMode();
    const listRef = useRef<HTMLOListElement>(null);
    const hasCentered = useRef(false);

    // Keeps the current step in the middle of the list when the steps are too wide to all be in view.
    useEffect(() => {
        const list = listRef.current;
        if (!list) return;

        const center = (animate: boolean) => {
            const current = list.querySelector<HTMLElement>('[aria-current="step"]');
            if (!current) return;
            const left = current.offsetLeft - (list.clientWidth - current.offsetWidth) / 2;
            const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            list.scrollTo({ left: Math.max(0, left), behavior: animate && !reduceMotion ? "smooth" : "auto" });
        };

        center(hasCentered.current);
        hasCentered.current = true;

        // Rotating the device or resizing the window changes how much fits. An observer reports once as soon as it
        // starts watching, which would cut the smooth scroll above short, so only a real change in width counts.
        let width = list.clientWidth;
        const observer = new ResizeObserver(() => {
            if (list.clientWidth === width) return;
            width = list.clientWidth;
            center(false);
        });
        observer.observe(list);
        return () => observer.disconnect();
    }, [currentIndex, short]);
    const previousEnabled = currentIndex > 0 && !!enabledSteps[currentIndex - 1];
    return (
        <Nav aria-label="Progress">
            {short ? (
                <CompactProgress>
                    <StepButton
                        type="button"
                        aria-label="Previous step"
                        disabled={!previousEnabled}
                        onClick={() => onStepSelected(currentIndex - 1)}
                    >
                        <ChevronLeft size={20} />
                    </StepButton>
                    <CompactLabel aria-current="step">
                        Step {currentIndex + 1} of {steps.length} · <strong>{steps[currentIndex]}</strong>
                    </CompactLabel>
                </CompactProgress>
            ) : (
                <List ref={listRef}>
                    {steps.map((label, index) => {
                        const state: StepState =
                            index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming";
                        const enabled = !!enabledSteps[index];
                        return (
                            <Item
                                key={label}
                                $complete={state === "complete"}
                                aria-current={state === "current" ? "step" : undefined}
                            >
                                <StepButton type="button" disabled={!enabled} onClick={() => onStepSelected(index)}>
                                    <Marker $state={state} $available={enabled}>
                                        <MarkerSymbol $visible={state !== "complete"}>{index + 1}</MarkerSymbol>
                                        <MarkerSymbol $visible={state === "complete"} aria-hidden="true">
                                            <Check size={16} strokeWidth={3} />
                                        </MarkerSymbol>
                                    </Marker>
                                    <Label $state={state} $available={enabled}>
                                        {label}
                                    </Label>
                                </StepButton>
                            </Item>
                        );
                    })}
                </List>
            )}
            {actions && (
                <>
                    <Divider aria-hidden="true" />
                    <Actions>{actions}</Actions>
                </>
            )}
        </Nav>
    );
};

export default PageStepper;
