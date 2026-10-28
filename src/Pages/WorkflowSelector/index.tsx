import { FunctionComponent, useEffect, useState } from "react";
import { CollectionProduct, ProductWorkflow } from "@spiffcommerce/core";
import SelectorTile from "../components/SelectorTile";
import SelectorContainer from "../components/SelectorContainer";

const WorkflowSelector: FunctionComponent<{
    product: CollectionProduct;
    onWorkflowSelected: (workflow: ProductWorkflow) => void;
}> = ({ product, onWorkflowSelected }) => {
    const [loading, setLoading] = useState<boolean>(true);
    const [workflows, setWorkflows] = useState<ProductWorkflow[] | undefined>(undefined);

    useEffect(() => {
        try {
            setWorkflows(product.getAllWorkflows());
        } finally {
            setLoading(false);
        }
    }, [product]);

    if (loading && !workflows) {
        // TODO: spinner
        return <div>Loading...</div>;
    }

    if (!workflows) {
        // TODO: style better
        return <div>We ran into a problem loading the available products, sorry.</div>;
    }

    return (
        <SelectorContainer loading={loading}>
            {workflows.map((workflow) => (
                <SelectorTile
                    key={workflow.getId()}
                    imageUrl={workflow.getThumbnail()}
                    title={workflow.getName()}
                    onClick={() => {
                        setLoading(true);
                        onWorkflowSelected(workflow);
                    }}
                />
            ))}
        </SelectorContainer>
    );
};

export default WorkflowSelector;
