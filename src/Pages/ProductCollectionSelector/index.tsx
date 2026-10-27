import { FunctionComponent, useEffect, useState } from "react";
import Text from "../../components/text";
import useActivation from "../../hooks/useActivation";
import { getProductCollections, ProductCollection } from "@spiffcommerce/core";

const ProductCollectionCard: FunctionComponent<{
    collection: ProductCollection;
    onClick: () => void;
}> = ({ collection, onClick }) => {
    // TODO: shared card component
    // TODO: card image
    return (
        <div>
            <Text onClick={() => onClick()}>{collection.getName()}</Text>
        </div>
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

    if (loading) {
        // TODO: spinner
        return <div>Loading...</div>;
    }

    if (!collections) {
        // TODO: style better
        return <div>We ran into a problem loading the available collections, sorry.</div>;
    }

    return (
        <div>
            {collections.map((collection) => (
                <ProductCollectionCard
                    key={collection.getId()}
                    collection={collection}
                    onClick={() => onCollectionSelected(collection)}
                />
            ))}
        </div>
    );
};

export default ProductCollectionSelector;
