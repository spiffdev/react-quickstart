import { FunctionComponent, useEffect, useState } from "react";
import { CollectionProduct, ProductCollection } from "@spiffcommerce/core";
import SelectorTile from "../components/SelectorTile";
import SelectorContainer from "../components/SelectorContainer";
import LoadingOverlay from "../components/LoadingOverlay";

const ProductSelector: FunctionComponent<{
    collection: ProductCollection;
    onProductSelected: (collectionProduct: CollectionProduct) => void;
}> = ({ collection, onProductSelected }) => {
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

    return (
        <SelectorContainer loading={loading}>
            {collectionProducts.map((collectionProduct) => (
                <SelectorTile
                    key={collectionProduct.getId()}
                    imageUrl={collectionProduct.getDisplayImage()}
                    title={collectionProduct.getName()}
                    onClick={() => {
                        setLoading(true);
                        onProductSelected(collectionProduct);
                    }}
                />
            ))}
        </SelectorContainer>
    );
};

export default ProductSelector;
