import { FunctionComponent, useEffect, useMemo, useState } from "react";
import Text from "../../components/text";
import useActivation from "../../hooks/useActivation";
import { getProductCollections, ProductCollection } from "@spiffcommerce/core";
import Card from "../../components/card";
import Button from "../../components/button";

const ProductCollectionCard: FunctionComponent<{
    collection: ProductCollection;
    onClick: () => void;
}> = ({ collection, onClick }) => {
    // TODO: make basic "card" component to keep this stuff shared
    const image = useMemo(() => collection.getImage()?.fileLink, [collection]);
    return (
        <Card>
            {image ? <img src={image} width="150px" /> : undefined}
            <Text>{collection.getName()}</Text>
            <Button onClick={() => onClick()}>
                <Text>Select</Text>
            </Button>
        </Card>
    );
};

const ProductCollectionSelector: FunctionComponent<{
    onCollectionSelected: (collection: ProductCollection) => void;
}> = ({ onCollectionSelected }) => {
    const activation = useActivation();
    const [loading, setLoading] = useState<boolean>(true);
    const [collections, setCollections] = useState<ProductCollection[] | undefined>(undefined);

    useEffect(() => {
        getProductCollections(activation.activationProductCollections!.map((apc) => apc.productCollection.id))
            .then(setCollections)
            .finally(() => setLoading(false));
    }, [activation.activationProductCollections]);

    if (loading && !collections) {
        // TODO: spinner
        return <div>Loading...</div>;
    }

    if (!collections) {
        // TODO: style better
        return <div>We ran into a problem loading the available collections, sorry.</div>;
    }

    return (
        <div>
            {/* TODO: spinner and prevent clicking */}
            {loading && <div>Loading...</div>}
            {collections.map((collection) => (
                <ProductCollectionCard
                    key={collection.getId()}
                    collection={collection}
                    onClick={() => {
                        setLoading(true);
                        onCollectionSelected(collection);
                    }}
                />
            ))}
        </div>
    );
};

export default ProductCollectionSelector;
