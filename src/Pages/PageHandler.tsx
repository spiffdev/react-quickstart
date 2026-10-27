import { FunctionComponent, useCallback, useEffect, useState } from "react";
import useBundle from "../hooks/useBundle";
import Text from "../components/text";
import ProductCollectionSelector from "./ProductCollectionSelector";
import { ProductCollection } from "@spiffcommerce/core";

type PageType = "collection" | "product" | "workflow";

const PageHandler: FunctionComponent<{}> = () => {
    const bundle = useBundle();
    const [page, setPage] = useState<PageType>("collection");

    useEffect(() => {
        // Whenever the bundle changes (i.e. a new bundle is loaded) we need to reset
        if (bundle.getProductCollection()) {
            setPage("product");
        }
    }, [bundle]);

    const handleCollectionSelected = useCallback(
        async (collection: ProductCollection) => {
            await bundle.assignProductCollection(collection.getId());
            setPage("product");
        },
        [bundle],
    );

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
                    <Text>{bundle.getProductCollection()?.getId()}</Text>
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
