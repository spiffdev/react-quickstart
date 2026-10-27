import { FunctionComponent, useCallback, useEffect, useState } from "react";
import useBundle from "../hooks/useBundle";
import Text from "../components/text";
import ProductCollectionSelector from "./ProductCollectionSelector";
import { CollectionProduct, ProductCollection } from "@spiffcommerce/core";
import ProductSelector from "./ProductSelector";

type PageType = "collection" | "product" | "workflow" | "experience";

const PageHandler: FunctionComponent<{}> = () => {
    const bundle = useBundle();
    const [page, setPage] = useState<PageType>("collection");
    const [collection, setCollection] = useState<ProductCollection | undefined>(undefined);
    const [product, setProduct] = useState<CollectionProduct | undefined>(undefined);

    useEffect(() => {
        // Whenever the bundle changes (i.e. a new bundle is loaded) we need to reset
        const collection = bundle.getProductCollection();
        if (collection) {
            setCollection(collection);

            const experiences = bundle.getWorkflowExperiences();
            if (experiences.length > 0) {
                // TODO: assign state object and set page
            }

            setPage("product");
        }
    }, [bundle]);

    const handleCollectionSelected = useCallback(
        async (collection: ProductCollection) => {
            setCollection(collection);
            await bundle.assignProductCollection(collection.getId());
            setPage("product");
        },
        [bundle],
    );

    const handleProductSelected = useCallback(async (collectionProduct: CollectionProduct) => {
        setProduct(collectionProduct);
        setPage("workflow");
    }, []);

    switch (page) {
        case "collection":
            return (
                <div>
                    <ProductCollectionSelector onCollectionSelected={handleCollectionSelected} />
                </div>
            );
        case "product":
            return (
                <div>
                    <ProductSelector collection={collection!} onProductSelected={handleProductSelected} />
                </div>
            );
        case "workflow":
            return (
                <div>
                    <Text>{bundle.getProductCollection()?.getId()}</Text>
                </div>
            );
    }
};

export default PageHandler;
