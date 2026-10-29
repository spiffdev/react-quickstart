import { FunctionComponent, useCallback, useEffect, useState } from "react";
import useBundle from "../hooks/useBundle";
import ProductCollectionSelector from "./ProductCollectionSelector";
import { CollectionProduct, ProductCollection, ProductWorkflow, WorkflowExperience } from "@spiffcommerce/core";
import ProductSelector from "./ProductSelector";
import useClient from "../hooks/useClient";
import WorkflowSelector from "./WorkflowSelector";
import Customization from "./Customization";
import ExperienceSwitcher from "./components/ExperienceSwitcher";
import PageStepper from "./components/PageStepper";
import type { SpiffThemeLoader } from "@spiffcommerce/theme-bridge";

type PageType = "collection" | "product" | "workflow" | "experience";

// The pages in the order the customer visits them, and the heading each is shown under.
const PAGE_STEPS: { page: PageType; label: string }[] = [
    { page: "collection", label: "Collection" },
    { page: "product", label: "Product" },
    { page: "workflow", label: "Design" },
    { page: "experience", label: "Personalise" },
];

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
        }

        // A reloaded bundle already has products, so pick up where the customer left off.
        const experiences = bundle.getWorkflowExperiences();
        if (experiences.length > 0) {
            setExperience(experiences[0]);
            setPage("experience");
        } else if (collection) {
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

    const handleFinish = useCallback(async () => {
        // A screenshot can only be taken from the live preview when there is a single experience.
        const takeScreenshot =
            bundle.getWorkflowExperienceCount() === 1
                ? (wfe: WorkflowExperience, use3D?: boolean) => wfe.createPreviewImage(use3D, 1024)
                : undefined;
        const result = await bundle.finish(undefined, takeScreenshot);
        const spiffThemeLoader = (window as any).SpiffThemeLoader as SpiffThemeLoader;
        spiffThemeLoader.addToEcommerceCart(result);
    }, [bundle]);

    return (
        <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <PageStepper
                steps={PAGE_STEPS.map((pageStep) => pageStep.label)}
                currentIndex={PAGE_STEPS.findIndex((pageStep) => pageStep.page === page)}
            />
            <div style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden", position: "relative" }}>
                {page === "collection" && <ProductCollectionSelector onCollectionSelected={handleCollectionSelected} />}
                {page === "product" && (
                    <ProductSelector collection={collection!} onProductSelected={handleProductSelected} />
                )}
                {page === "workflow" && (
                    <WorkflowSelector product={product!} onWorkflowSelected={handleWorkflowSelected} />
                )}
                {page === "experience" && experience && (
                    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        {bundle.getWorkflowExperienceCount() > 1 && (
                            <ExperienceSwitcher
                                experiences={bundle.getWorkflowExperiences()}
                                active={experience}
                                onSelect={setExperience}
                            />
                        )}
                        <div style={{ flex: "1 1 0", minHeight: 0 }}>
                            <Customization
                                key={experience.getTransaction().id}
                                workflowExperience={experience}
                                onNext={handleFinish}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PageHandler;
