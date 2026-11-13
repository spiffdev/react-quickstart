import { FunctionComponent } from "react";
import { WorkflowExperience } from "@spiffcommerce/core";
import styled from "styled-components";

const Bar = styled.div`
    border-bottom: 1px solid #e0e0e0;
    background-color: #fff;
`;

const Row = styled.div`
    display: flex;
    gap: 8px;
    padding: 8px 16px;
    overflow-x: auto;
`;

// The products added to the selected design, which sit under the designs in a smaller size.
const ChildRow = styled(Row)`
    align-items: center;
    padding-top: 0;
    gap: 6px;
`;

type TabState = "active" | "parent-of-active" | "inactive";

const Tab = styled.button<{ $state: TabState; $small?: boolean }>`
    flex-shrink: 0;
    padding: ${(props) => (props.$small ? "3px 12px" : "6px 16px")};
    font-size: ${(props) => (props.$small ? "12px" : "14px")};
    cursor: pointer;
    white-space: nowrap;
    color: ${(props) => (props.$state === "active" ? "var(--theme-primary-contrast-color)" : "var(--theme-primary-color)")};
    background-color: ${(props) => (props.$state === "active" ? "var(--theme-primary-color)" : "#fff")};
    border: ${(props) => (props.$state === "parent-of-active" ? "2px" : "1px")} solid var(--theme-primary-color);
    border-radius: 16px;
`;

const experienceId = (experience: WorkflowExperience) => experience.getTransaction().id;
const parentId = (experience: WorkflowExperience) => experience.getTransaction().parentTransaction?.id;

/**
 * Lets the customer move between the products in a bundle. Products which were added to another product (by a product
 * step) are shown in smaller tabs under it, and only while that product or one of its siblings is selected.
 */
const ExperienceSwitcher: FunctionComponent<{
    experiences: WorkflowExperience[];
    active: WorkflowExperience | undefined;
    /**
     * Shows the products added to a design as smaller tabs under it. When false every experience gets a tab in the
     * one row.
     */
    groupChildren?: boolean;
    onSelect: (experience: WorkflowExperience) => void;
}> = ({ experiences, active, groupChildren = true, onSelect }) => {
    const ids = new Set(experiences.map(experienceId));
    // A child whose parent isn't in the bundle has nowhere to sit, so it's shown with the others.
    const isChild = (experience: WorkflowExperience) => {
        const parent = parentId(experience);
        return groupChildren && !!parent && ids.has(parent);
    };
    const parents = experiences.filter((experience) => !isChild(experience));
    // The design whose products are on show: the active one, or the one the active product was added to.
    const activeId = active ? experienceId(active) : undefined;
    const shownParentId = active && isChild(active) ? parentId(active) : activeId;
    const children = experiences.filter((experience) => isChild(experience) && parentId(experience) === shownParentId);

    const stateOf = (experience: WorkflowExperience): TabState =>
        experienceId(experience) === activeId
            ? "active"
            : experienceId(experience) === shownParentId
              ? "parent-of-active"
              : "inactive";

    return (
        <Bar>
            <Row>
                {parents.map((experience, index) => (
                    <Tab
                        key={experienceId(experience)}
                        type="button"
                        $state={stateOf(experience)}
                        onClick={() => onSelect(experience)}
                    >
                        {experience.getTransaction().designName ||
                            experience.getProduct()?.name ||
                            `Product ${index + 1}`}
                    </Tab>
                ))}
            </Row>
            {children.length > 0 && (
                <ChildRow>
                    {children.map((experience, index) => (
                        <Tab
                            key={experienceId(experience)}
                            type="button"
                            $small
                            $state={stateOf(experience)}
                            onClick={() => onSelect(experience)}
                        >
                            {experience.getTransaction().designName ||
                                experience.getProduct()?.name ||
                                `Product ${index + 1}`}
                        </Tab>
                    ))}
                </ChildRow>
            )}
        </Bar>
    );
};

export default ExperienceSwitcher;
