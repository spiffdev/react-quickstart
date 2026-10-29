import { FunctionComponent } from "react";
import { WorkflowExperience } from "@spiffcommerce/core";
import styled from "styled-components";

const Bar = styled.div`
    display: flex;
    gap: 8px;
    padding: 8px 16px;
    overflow-x: auto;
    border-bottom: 1px solid #e0e0e0;
    background-color: #fff;
`;

const Tab = styled.button<{ $active: boolean }>`
    flex-shrink: 0;
    padding: 6px 16px;
    font-size: 14px;
    cursor: pointer;
    white-space: nowrap;
    color: ${(props) => (props.$active ? "var(--theme-primary-contrast-color)" : "var(--theme-primary-color)")};
    background-color: ${(props) => (props.$active ? "var(--theme-primary-color)" : "#fff")};
    border: 1px solid var(--theme-primary-color);
    border-radius: 16px;
`;

const experienceId = (experience: WorkflowExperience) => experience.getTransaction().id;

/**
 * Lets the customer move between the products in a bundle.
 */
const ExperienceSwitcher: FunctionComponent<{
    experiences: WorkflowExperience[];
    active: WorkflowExperience | undefined;
    onSelect: (experience: WorkflowExperience) => void;
}> = ({ experiences, active, onSelect }) => {
    return (
        <Bar>
            {experiences.map((experience, index) => (
                <Tab
                    key={experienceId(experience)}
                    type="button"
                    $active={!!active && experienceId(active) === experienceId(experience)}
                    onClick={() => onSelect(experience)}
                >
                    {experience.getProduct()?.name || `Product ${index + 1}`}
                </Tab>
            ))}
        </Bar>
    );
};

export default ExperienceSwitcher;
