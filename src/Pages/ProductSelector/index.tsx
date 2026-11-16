import { FunctionComponent, useCallback, useEffect, useRef, useState } from "react";
import { CollectionProduct, ProductCollection, ProductWorkflow, WorkflowExperience } from "@spiffcommerce/core";
import styled from "styled-components";
import { MEDIA } from "../../layout";
import Cart from "./Cart";
import SelectorTile from "../components/SelectorTile";
import SelectorContainer from "../components/SelectorContainer";
import LoadingOverlay from "../components/LoadingOverlay";

// The products on one side and the cart on the other, which moves below the products when there's no room beside them.
const Layout = styled.div`
    position: relative;
    display: flex;
    height: 100%;

    @media ${MEDIA.stacked} {
        flex-direction: column;
    }
`;

const Products = styled.div`
    position: relative;
    flex: 1 1 0;
    min-width: 0;
    min-height: 0;
`;

const ProductSelector: FunctionComponent<{
    collection: ProductCollection;
    /** The designs in the customer's cart. */
    experiences: WorkflowExperience[];
    /** Adds the product to the cart, as a design made with the chosen workflow. Not given when the product has none. */
    onProductAdded: (product: CollectionProduct, workflow: ProductWorkflow | undefined) => void | Promise<void>;
    onExperienceRemoved: (experience: WorkflowExperience) => void | Promise<void>;
    onQuantityChanged: (experience: WorkflowExperience, quantity: number) => void | Promise<void>;
    onContinue: () => void;
}> = ({ collection, experiences, onProductAdded, onExperienceRemoved, onQuantityChanged, onContinue }) => {
    // Changes to the cart are made one at a time, in the order they were asked for, as each one changes the bundle.
    const queue = useRef<Promise<unknown>>(Promise.resolve());
    // Adds waiting or in progress, by product, so the tile which was clicked can say so.
    const [pendingAdds, setPendingAdds] = useState<ReadonlyMap<string, number>>(new Map());
    // Removals and quantity changes waiting or in progress.
    const [updates, setUpdates] = useState(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [collectionProducts, setCollectionProducts] = useState<CollectionProduct[] | undefined>(undefined);

    // Handlers report their own failures to the customer, but a rejection must never stall the queue.
    const enqueue = useCallback((task: () => void | Promise<void>) => {
        const next = queue.current.then(task).catch((error) => console.error("Error changing the cart:", error));
        queue.current = next;
        return next;
    }, []);

    useEffect(() => {
        // Just fetch all products.
        // Note: it's better to call fetchProductsFeed and request in batches. It also includes filtering.
        collection
            .fetchProducts()
            .then(setCollectionProducts)
            .finally(() => setLoading(false));
    }, [collection]);

    if (loading && !collectionProducts) {
        return <LoadingOverlay />;
    }

    if (!collectionProducts) {
        // TODO: style better
        return <div>We ran into a problem loading the available products, sorry.</div>;
    }

    const addProduct = (product: CollectionProduct, workflow: ProductWorkflow | undefined) => {
        const id = product.getId();
        const adjust = (change: number) =>
            setPendingAdds((current) => {
                const next = new Map(current);
                const count = (next.get(id) ?? 0) + change;
                if (count > 0) next.set(id, count);
                else next.delete(id);
                return next;
            });
        adjust(1);
        void enqueue(() => onProductAdded(product, workflow)).finally(() => adjust(-1));
    };

    const update = (task: () => void | Promise<void>) => {
        setUpdates((current) => current + 1);
        void enqueue(task).finally(() => setUpdates((current) => current - 1));
    };

    const removeExperience = (experience: WorkflowExperience) => update(() => onExperienceRemoved(experience));

    const changeQuantity = (experience: WorkflowExperience, quantity: number) =>
        update(() => onQuantityChanged(experience, quantity));

    // The cart isn't complete until everything asked of it has been done.
    const working = updates > 0 || pendingAdds.size > 0;

    return (
        <Layout>
            <Products>
                <SelectorContainer>
                    {collectionProducts.map((collectionProduct) => {
                        const workflows = collectionProduct.getAllWorkflows();
                        return (
                            <SelectorTile
                                key={collectionProduct.getId()}
                                imageUrl={collectionProduct.getDisplayImage()}
                                pending={pendingAdds.get(collectionProduct.getId()) ?? 0}
                                title={collectionProduct.getName()}
                                // A product with several workflows lets the customer pick which one to add.
                                choices={workflows.map((workflow) => ({
                                    id: workflow.getId(),
                                    label: workflow.getName(),
                                }))}
                                onChoose={(id) =>
                                    addProduct(
                                        collectionProduct,
                                        workflows.find((workflow) => workflow.getId() === id),
                                    )
                                }
                                onClick={() => addProduct(collectionProduct, workflows[0])}
                            />
                        );
                    })}
                </SelectorContainer>
            </Products>
            <Cart
                experiences={experiences}
                busy={updates > 0}
                canContinue={!working}
                onRemove={removeExperience}
                onQuantityChange={changeQuantity}
                onContinue={onContinue}
            />
        </Layout>
    );
};

export default ProductSelector;
