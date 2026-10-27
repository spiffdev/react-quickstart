import { FunctionComponent, useEffect, useState } from "react";
import { CollectionProduct, ProductWorkflow } from "@spiffcommerce/core";
import SelectorTile from "../../components/shared/SelectorTile";

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
        <div>
            {/* TODO: spinner and prevent clicking */}
            {loading && <div>Loading...</div>}
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
        </div>
    );
};

export default WorkflowSelector;
