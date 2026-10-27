import { FunctionComponent, useEffect, useState } from "react";
import { CollectionProduct, ProductCollection } from "@spiffcommerce/core";
import SelectorTile from "../../components/shared/SelectorTile";

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
        // TODO: spinner
        return <div>Loading...</div>;
    }

    if (!collectionProducts) {
        // TODO: style better
        return <div>We ran into a problem loading the available products, sorry.</div>;
    }

    return (
        <div>
            {/* TODO: spinner and prevent clicking */}
            {loading && <div>Loading...</div>}
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
        </div>
    );
};

export default ProductSelector;
