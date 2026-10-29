import { FunctionComponent } from "react";
import styled from "styled-components";

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

    /* The connector leading to the next step. */
    &:not(:last-child)::after {
        content: "";
        flex: 1 1 0;
        min-width: 16px;
        height: 2px;
        margin: 0 12px;
        background-color: ${(props) => (props.$complete ? "#007bff" : "#e0e0e0")};
    }
`;

const Marker = styled.span<{ $state: "complete" | "current" | "upcoming" }>`
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
    border: 2px solid ${(props) => (props.$state === "upcoming" ? "#bdbdbd" : "#007bff")};
    color: ${(props) => (props.$state === "complete" ? "#fff" : props.$state === "current" ? "#007bff" : "#9e9e9e")};
    background-color: ${(props) => (props.$state === "complete" ? "#007bff" : "#fff")};
`;

const Label = styled.span<{ $state: "complete" | "current" | "upcoming" }>`
    margin-left: 8px;
    font-size: 14px;
    font-weight: ${(props) => (props.$state === "current" ? 600 : 400)};
    white-space: nowrap;
    color: ${(props) => (props.$state === "upcoming" ? "#9e9e9e" : "#212121")};
`;

/**
 * Shows the customer how far through the pages they are.
 */
const PageStepper: FunctionComponent<{
    steps: string[];
    currentIndex: number;
}> = ({ steps, currentIndex }) => {
    return (
        <Nav aria-label="Progress">
            <List>
                {steps.map((label, index) => {
                    const state = index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming";
                    return (
                        <Item
                            key={label}
                            $complete={state === "complete"}
                            aria-current={state === "current" ? "step" : undefined}
                        >
                            <Marker $state={state}>{state === "complete" ? "✓" : index + 1}</Marker>
                            <Label $state={state}>{label}</Label>
                        </Item>
                    );
                })}
            </List>
        </Nav>
    );
};

export default PageStepper;
