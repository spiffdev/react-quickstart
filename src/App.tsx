import { FunctionComponent, useEffect, useState } from "react";
import { SpiffThemeLoader, ThemeContext } from "@spiffcommerce/theme-bridge";
import { Bundle, SpiffCommerceClient } from "@spiffcommerce/core";

const App: FunctionComponent<{
    context: ThemeContext;
}> = ({ context }) => {
    const [client] = useState<SpiffCommerceClient>(() => {
        const client = new SpiffCommerceClient({
            applicationKey: context.applicationKey,
        });
        if (import.meta.env.DEV === true && import.meta.env.VITE_SERVER_URL) {
            client.configure({
                hubUrl: import.meta.env.VITE_HUB_URL,
                serverUrl: import.meta.env.VITE_SERVER_URL,
                servicesApiUrl: import.meta.env.VITE_SERVICES_URL,
            });
        } else {
            const spiffThemeLoader = (window as any).SpiffThemeLoader as SpiffThemeLoader;
            spiffThemeLoader.configureClient(client);
        }
        return client;
    });

    const [bundle, setBundle] = useState<Bundle | undefined>(undefined);

    useEffect(() => {
        const loadBundle = async () => {
            const bundle = await client.getNewBundle(import.meta.env.VITE_PRODUCT_COLLECTION_ID);
            const productCollection = bundle.getProductCollection();
            if (productCollection) {
                await productCollection.fetchProducts();
                const products = productCollection.getProducts();
                console.log("Products: ", products);
                setBundle(bundle);
            }
        };
        loadBundle();
    }, []);

    if (!bundle) return <div>Loading...</div>;

    return <div className="app-body">Hello</div>;
};

export default App;
