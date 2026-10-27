import { FunctionComponent, useEffect, useState } from "react";
import useActivation from "../../hooks/useActivation";
import { getProductCollections, ProductCollection } from "@spiffcommerce/core";
import SelectorTile from "../../components/shared/SelectorTile";

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
                <SelectorTile
                    key={collection.getId()}
                    imageUrl={collection.getImage()?.fileLink}
                    title={collection.getName()}
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
