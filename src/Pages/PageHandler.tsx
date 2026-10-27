import { FunctionComponent, useCallback, useEffect, useState } from "react";
import useBundle from "../hooks/useBundle";
import Typography from "../components/typography";
import ProductCollectionSelector from "./ProductCollectionSelector";
import { CollectionProduct, ProductCollection, ProductWorkflow, WorkflowExperience } from "@spiffcommerce/core";
import ProductSelector from "./ProductSelector";
import useClient from "../hooks/useClient";
import WorkflowSelector from "./WorkflowSelector";

type PageType = "collection" | "product" | "workflow" | "experience";

const PageHandler: FunctionComponent<{}> = () => {
    const client = useClient();
    const bundle = useBundle();
    const [page, setPage] = useState<PageType>("collection");
    const [collection, setCollection] = useState<ProductCollection | undefined>(undefined);
    const [product, setProduct] = useState<CollectionProduct | undefined>(undefined);
    const [experience, setExperience] = useState<WorkflowExperience | undefined>(undefined);

    useEffect(() => {
        // Whenever the bundle changes (i.e. a new bundle is loaded) we need to reset
        const collection = bundle.getProductCollection();
        if (collection) {
            setCollection(collection);

            const experiences = bundle.getWorkflowExperiences();
            if (experiences.length > 0) {
                // TODO: assign state object and set page
            }

            setPage("product");
        }
    }, [bundle]);

    const handleCollectionSelected = useCallback(
        async (collection: ProductCollection) => {
            setCollection(collection);
            await bundle.assignProductCollection(collection.getId());
            setPage("product");
        },
        [bundle],
    );

    const handleWorkflowSelected = useCallback(
        async (workflow: ProductWorkflow) => {
            const [experience] = await client.getWorkflowExperiences([
                {
                    type: "integration",
                    workflowId: workflow.getId(),
                    integrationProductId: product!.getCurrentIntegration().id,
                },
            ]);
            setExperience(experience);
            await bundle.addWorkflowExperience(experience);
            setPage("experience");
        },
        [bundle, client, product],
    );

    const handleProductSelected = useCallback(
        async (collectionProduct: CollectionProduct) => {
            setProduct(collectionProduct);
            const workflows = collectionProduct.getAllWorkflows();
            if (workflows.length === 1) {
                handleWorkflowSelected(workflows[0]);
            } else {
                setPage("workflow");
            }
        },
        [handleWorkflowSelected],
    );

    switch (page) {
        case "collection":
            return <ProductCollectionSelector onCollectionSelected={handleCollectionSelected} />;
        case "product":
            return <ProductSelector collection={collection!} onProductSelected={handleProductSelected} />;
        case "workflow":
            return <WorkflowSelector product={product!} onWorkflowSelected={handleWorkflowSelected} />;
        case "experience":
            return (
                <div>
                    <Typography>{bundle.getProductCollection()?.getId()}</Typography>
                </div>
            );
    }
};

export default PageHandler;
