import { FunctionComponent, useCallback, useEffect, useRef, useState } from "react";
import useBundle from "../hooks/useBundle";
import ProductCollectionSelector from "./ProductCollectionSelector";
import { CollectionProduct, ProductCollection, ProductWorkflow, WorkflowExperience } from "@spiffcommerce/core";
import ProductSelector from "./ProductSelector";
import useClient from "../hooks/useClient";
import WorkflowSelector from "./WorkflowSelector";
import Customization from "./Customization";
import ErrorBanner from "../components/ErrorBanner";
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

const pageIndex = (page: PageType) => PAGE_STEPS.findIndex((step) => step.page === page);

const PageHandler: FunctionComponent<{}> = () => {
    const client = useClient();
    const bundle = useBundle();
    const [page, setPage] = useState<PageType>("collection");
    const [collection, setCollection] = useState<ProductCollection | undefined>(undefined);
    const [product, setProduct] = useState<CollectionProduct | undefined>(undefined);
    const [workflow, setWorkflow] = useState<ProductWorkflow | undefined>(undefined);
    // The experience shown on the personalise page.
    const [experience, setExperience] = useState<WorkflowExperience | undefined>(undefined);
    // The experience created by the current product and workflow selection, if any.
    const [selectionExperience, setSelectionExperience] = useState<WorkflowExperience | undefined>(undefined);
    // The furthest page the customer can return to using the stepper.
    const [reachedIndex, setReachedIndex] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
    // Experiences made by these pages in this visit. Only these are ever discarded by a new selection, so a
    // reloaded bundle's existing designs are never thrown away.
    const createdExperiences = useRef(new Set<WorkflowExperience>());

    useEffect(() => {
        // Whenever the bundle changes (i.e. a new bundle is loaded) we need to reset
        const bundleCollection = bundle.getProductCollection();
        createdExperiences.current.clear();
        setErrorMessage(undefined);
        setCollection(bundleCollection);
        setProduct(undefined);
        setWorkflow(undefined);
        setSelectionExperience(undefined);

        // A reloaded bundle already has products, so pick up where the customer left off.
        const experiences = bundle.getWorkflowExperiences();
        if (experiences.length > 0) {
            setExperience(experiences[0]);
            setPage("experience");
            setReachedIndex(pageIndex("experience"));
        } else {
            setExperience(undefined);
            setPage(bundleCollection ? "product" : "collection");
            setReachedIndex(bundleCollection ? pageIndex("product") : pageIndex("collection"));
        }
    }, [bundle]);

    // Runs a change to the bundle. React state is only updated by `action` once every call it makes has succeeded,
    // so a failure leaves the page exactly as it was and the customer can simply try again.
    const attempt = useCallback(async (action: () => Promise<void>, failureMessage: string) => {
        setErrorMessage(undefined);
        try {
            await action();
        } catch (error) {
            console.error(failureMessage, error);
            setErrorMessage(failureMessage);
        }
    }, []);

    // A new selection replaces whatever the previous one led to. Nothing is cleared unless the removal succeeds.
    const removeSelectionExperience = useCallback(async () => {
        if (!selectionExperience) return;
        if (createdExperiences.current.has(selectionExperience)) {
            await bundle.removeWorkflowExperience(selectionExperience);
            createdExperiences.current.delete(selectionExperience);
        }
        setExperience((current) => (current === selectionExperience ? undefined : current));
        setSelectionExperience(undefined);
    }, [bundle, selectionExperience]);

    // Creates the new experience before the previous one is removed, so a failure never leaves the customer without one.
    const startExperience = useCallback(
        async (selectedProduct: CollectionProduct, selectedWorkflow: ProductWorkflow) => {
            const [created] = await client.getWorkflowExperiences([
                {
                    type: "integration",
                    workflowId: selectedWorkflow.getId(),
                    integrationProductId: selectedProduct.getCurrentIntegration().id,
                },
            ]);
            if (!created) {
                throw new Error("No workflow experience was created.");
            }
            await bundle.addWorkflowExperience(created);
            createdExperiences.current.add(created);

            let leftoverWarning: string | undefined;
            try {
                await removeSelectionExperience();
            } catch (error) {
                console.error("Error removing the previous design from the bundle:", error);
                leftoverWarning =
                    "Your new design is ready, but the previous one could not be removed from your bundle.";
            }

            setProduct(selectedProduct);
            setWorkflow(selectedWorkflow);
            setSelectionExperience(created);
            setExperience(created);
            setReachedIndex(pageIndex("experience"));
            setPage("experience");
            if (leftoverWarning) {
                setErrorMessage(leftoverWarning);
            }
        },
        [bundle, client, removeSelectionExperience],
    );

    const handleCollectionSelected = useCallback(
        (selected: ProductCollection) =>
            attempt(async () => {
                if (collection?.getId() === selected.getId()) {
                    // Nothing has changed, so keep everything the customer has already chosen.
                    setReachedIndex((reached) => Math.max(reached, pageIndex("product")));
                    setPage("product");
                    return;
                }

                // Assigning is safe to repeat, so if removing the old design fails the customer can just try again.
                await bundle.assignProductCollection(selected.getId());
                await removeSelectionExperience();
                setCollection(selected);
                setProduct(undefined);
                setWorkflow(undefined);
                setReachedIndex(pageIndex("product"));
                setPage("product");
            }, "We couldn't select that collection. Please try again."),
        [attempt, bundle, collection, removeSelectionExperience],
    );

    const handleProductSelected = useCallback(
        (selected: CollectionProduct) =>
            attempt(async () => {
                const workflows = selected.getAllWorkflows();
                if (workflows.length === 0) {
                    throw new Error("The selected product has no designs available.");
                }

                if (product?.getId() === selected.getId()) {
                    if (workflows.length > 1) {
                        setReachedIndex((reached) => Math.max(reached, pageIndex("workflow")));
                        setPage("workflow");
                    } else if (selectionExperience) {
                        setExperience(selectionExperience);
                        setPage("experience");
                    } else {
                        await startExperience(selected, workflows[0]);
                    }
                    return;
                }

                if (workflows.length === 1) {
                    await startExperience(selected, workflows[0]);
                    return;
                }

                await removeSelectionExperience();
                setProduct(selected);
                setWorkflow(undefined);
                setReachedIndex(pageIndex("workflow"));
                setPage("workflow");
            }, "We couldn't set up that product. Please try again."),
        [attempt, product, removeSelectionExperience, selectionExperience, startExperience],
    );

    const handleWorkflowSelected = useCallback(
        (selected: ProductWorkflow) =>
            attempt(async () => {
                if (!product) return;

                if (selectionExperience && workflow?.getId() === selected.getId()) {
                    setExperience(selectionExperience);
                    setPage("experience");
                    return;
                }

                await startExperience(product, selected);
            }, "We couldn't start that design. Please try again."),
        [attempt, product, selectionExperience, startExperience, workflow],
    );

    const handleFinish = useCallback(async () => {
        try {
            // A screenshot can only be taken from the live preview when there is a single experience.
            const takeScreenshot =
                bundle.getWorkflowExperienceCount() === 1
                    ? (wfe: WorkflowExperience, use3D?: boolean) => wfe.createPreviewImage(use3D, 1024)
                    : undefined;
            const result = await bundle.finish(undefined, takeScreenshot);
            const spiffThemeLoader = (window as any).SpiffThemeLoader as SpiffThemeLoader;
            spiffThemeLoader.addToEcommerceCart(result);
        } catch (error) {
            console.error("Error adding the bundle to the cart:", error);
            // The finish step shows this message under its button.
            throw new Error("We couldn't add your design to the cart. Please try again.");
        }
    }, [bundle]);

    // A page can be returned to once it has been reached, as long as what it needs still exists.
    const canVisit = (index: number) =>
        index <= reachedIndex &&
        PAGE_STEPS[index].page !== page &&
        (index === 0 || (index === 1 && !!collection) || (index === 2 && !!product) || (index === 3 && !!experience));

    return (
        <div style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <PageStepper
                steps={PAGE_STEPS.map((pageStep) => pageStep.label)}
                currentIndex={pageIndex(page)}
                enabledSteps={PAGE_STEPS.map((_, index) => canVisit(index))}
                onStepSelected={(index) => {
                    setErrorMessage(undefined);
                    setPage(PAGE_STEPS[index].page);
                }}
            />
            {errorMessage && <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(undefined)} />}
            <div style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden", position: "relative" }}>
                {page === "collection" && (
                    <ProductCollectionSelector
                        selectedCollectionId={collection?.getId()}
                        onCollectionSelected={handleCollectionSelected}
                    />
                )}
                {page === "product" && collection && (
                    <ProductSelector
                        collection={collection}
                        selectedProductId={product?.getId()}
                        onProductSelected={handleProductSelected}
                    />
                )}
                {page === "workflow" && product && (
                    <WorkflowSelector
                        product={product}
                        selectedWorkflowId={workflow?.getId()}
                        onWorkflowSelected={handleWorkflowSelected}
                    />
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
