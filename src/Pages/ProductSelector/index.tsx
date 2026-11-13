import { FunctionComponent, useEffect, useState } from "react";
import { CollectionProduct, ProductCollection, ProductWorkflow, WorkflowExperience } from "@spiffcommerce/core";
import styled from "styled-components";
import { MEDIA } from "../../layout";
import Cart from "./Cart";
import SelectorTile from "../components/SelectorTile";
import SelectorContainer from "../components/SelectorContainer";
import LoadingOverlay from "../components/LoadingOverlay";

// The products on one side and the cart on the other, which moves below the products when there's no room beside them.
const Layout = styled.div`
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
    const [updating, setUpdating] = useState(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [collectionProducts, setCollectionProducts] = useState<CollectionProduct[] | undefined>(undefined);

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

    // The tiles stop loading again if the change fails and the customer stays on this page.
    const addProduct = (product: CollectionProduct, workflow: ProductWorkflow | undefined) => {
        setLoading(true);
        Promise.resolve(onProductAdded(product, workflow)).finally(() => setLoading(false));
    };

    const removeExperience = (experience: WorkflowExperience) => {
        setUpdating(true);
        Promise.resolve(onExperienceRemoved(experience)).finally(() => setUpdating(false));
    };

    const changeQuantity = (experience: WorkflowExperience, quantity: number) => {
        setUpdating(true);
        Promise.resolve(onQuantityChanged(experience, quantity)).finally(() => setUpdating(false));
    };

    return (
        <Layout>
            <Products>
                <SelectorContainer loading={loading}>
                    {collectionProducts.map((collectionProduct) => {
                        const workflows = collectionProduct.getAllWorkflows();
                        return (
                            <SelectorTile
                                key={collectionProduct.getId()}
                                imageUrl={collectionProduct.getDisplayImage()}
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
                busy={loading || updating}
                onRemove={removeExperience}
                onQuantityChange={changeQuantity}
                onContinue={onContinue}
            />
        </Layout>
    );
};

export default ProductSelector;
