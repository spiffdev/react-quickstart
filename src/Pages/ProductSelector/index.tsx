import { FunctionComponent, useEffect, useMemo, useState } from "react";
import Text from "../../components/text";
import { CollectionProduct, ProductCollection } from "@spiffcommerce/core";
import Card from "../../components/card";
import Button from "../../components/button";

const ProductCard: FunctionComponent<{
    collectionProduct: CollectionProduct;
    onClick: () => void;
}> = ({ collectionProduct, onClick }) => {
    // TODO: make basic "card" component to keep this stuff shared
    const image = useMemo(() => collectionProduct.getDisplayImage(), [collectionProduct]);
    return (
        <Card>
            {image ? <img src={image} width="150px" /> : undefined}
            <Text>{collectionProduct.getName()}</Text>
            <Button onClick={() => onClick()}>
                <Text>Select</Text>
            </Button>
        </Card>
    );
};

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
                <ProductCard
                    key={collectionProduct.getId()}
                    collectionProduct={collectionProduct}
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
