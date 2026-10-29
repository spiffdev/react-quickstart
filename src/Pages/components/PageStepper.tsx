import { FunctionComponent } from "react";
import styled, { css } from "styled-components";

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
    flex: none;
    border-bottom: 1px solid #e0e0e0;
    background-color: #fff;
`;

const List = styled.ol`
    display: flex;
    align-items: center;
    margin: 0;
    padding: 12px 16px;
    list-style: none;
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
}> = ({ steps, currentIndex, enabledSteps, onStepSelected }) => {
    return (
        <Nav aria-label="Progress">
            <List>
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
                                        ✓
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
        </Nav>
    );
};

export default PageStepper;
