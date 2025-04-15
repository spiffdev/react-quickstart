import { FunctionComponent, useEffect, useState } from "react";
import { SpiffThemeLoader, ThemeContext, ThemeContextBundle } from "@spiffcommerce/theme-bridge";
import { Bundle, IntegrationType, SpiffCommerceClient } from "@spiffcommerce/core";

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
            const c = context as ThemeContextBundle;
            if (c.bundleOptions.type === "existing") {
                const bundle = await client.getExistingBundle(c.bundleOptions.bundleId, undefined, undefined, {});
                setBundle(bundle);
            } else {
                const bundle = await client.getNewBundle(c.bundleOptions.productCollectionId, undefined, {});
                const productCollection = bundle.getProductCollection();
                if (productCollection) {
                    await productCollection.fetchProducts();
                    const products = productCollection.getProducts();
                    console.log("Products: ", products);
                    setBundle(bundle);

                    const exampleProduct = products[0].getIntegrationByType(IntegrationType.Hub);
                    bundle.addWorkflowExperience(
                        await client.getWorkflowExperience({
                            type: "integration",
                            integrationProductId: exampleProduct?.id,
                            workflowId: products[0].getDefaultWorkflow().getId(),
                        }),
                    );
                }

                setBundle(bundle);
            }
        };
        loadBundle();
    }, []);

    if (!bundle) return <div>Loading...</div>;

    return (
        <div className="app-body">
            <ol>
                {bundle
                    .getProductCollection()
                    ?.getProducts()
                    .map((p) => (
                        <li>{p.getName()}</li>
                    ))}
            </ol>
        </div>
    );
};

export default App;
