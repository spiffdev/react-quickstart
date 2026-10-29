import { FunctionComponent, useEffect, useState } from "react";
import useActivation from "../../hooks/useActivation";
import { getProductCollections, ProductCollection } from "@spiffcommerce/core";
import SelectorTile from "../components/SelectorTile";
import SelectorContainer from "../components/SelectorContainer";
import LoadingOverlay from "../components/LoadingOverlay";

const ProductCollectionSelector: FunctionComponent<{
    selectedCollectionId?: string;
    onCollectionSelected: (collection: ProductCollection) => void | Promise<void>;
}> = ({ selectedCollectionId, onCollectionSelected }) => {
    const activation = useActivation();
    const [loading, setLoading] = useState<boolean>(true);
    const [collections, setCollections] = useState<ProductCollection[] | undefined>(undefined);

    useEffect(() => {
        getProductCollections(activation.activationProductCollections!.map((apc) => apc.productCollection.id))
            .then(setCollections)
            .finally(() => setLoading(false));
    }, [activation.activationProductCollections]);

    if (loading && !collections) {
        return <LoadingOverlay />;
    }

    if (!collections) {
        // TODO: style better
        return <div>We ran into a problem loading the available collections, sorry.</div>;
    }

    return (
        <SelectorContainer loading={loading}>
            {collections.map((collection) => (
                <SelectorTile
                    key={collection.getId()}
                    imageUrl={collection.getImage()?.fileLink}
                    title={collection.getName()}
                    selected={collection.getId() === selectedCollectionId}
                    onClick={() => {
                        setLoading(true);
                        // The tiles stop loading again if the selection fails and the customer stays on this page.
                        Promise.resolve(onCollectionSelected(collection)).finally(() => setLoading(false));
                    }}
                />
            ))}
        </SelectorContainer>
    );
};

export default ProductCollectionSelector;
