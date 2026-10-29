import { FunctionComponent, useEffect, useState } from "react";
import { SpiffThemeLoader, ThemeContext, ThemeContextBundle } from "@spiffcommerce/theme-bridge";
import { ActivationData, Bundle, CurrencyContext, IntegrationType, SpiffCommerceClient } from "@spiffcommerce/core";
import { BundleProvider } from "./hooks/useBundle";
import { CurrencyProvider } from "./hooks/useCurrency";
import { ThemeConfigurationProvider } from "./hooks/useThemeConfiguration";
import PageHandler from "./Pages/PageHandler";
import { ActivationProvider } from "./hooks/useActivation";
import { ClientProvider } from "./hooks/useClient";
import LoadingOverlay from "./Pages/components/LoadingOverlay";

function getProductCollectionForNewBundle(context: ThemeContext): string | null {
    const c = context as ThemeContextBundle;
    if (c.bundleOptions.type !== "new") {
        return null;
    }
    if (c.bundleOptions.productCollectionId) {
        return c.bundleOptions.productCollectionId;
    }
    // Exports in theme bridge which reference items in core are not exported correctly in the d.ts files.
    // This must be fixed internally.
    // For now, we're just manually casting since we can visit the file and see the correct type.
    const data = c.activation as ActivationData;
    if (!data.activationProductCollections || data.activationProductCollections.length !== 1) {
        // Either nothing is connected, or the activation has more than one collection linked.
        // Note: In single product mode this is undefined behaviour.
        return null;
    }
    return data.activationProductCollections[0].productCollection.id;
}

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
    const [currencyContext, setCurrencyContext] = useState<CurrencyContext | undefined>(undefined);

    useEffect(() => {
        if (!context.currency) {
            console.warn("No presentment currency was provided by the theme context; prices will not be displayed.");
            return;
        }
        client
            .getCurrencyContext(context.currency)
            .then(setCurrencyContext)
            .catch((error) => console.error("Error loading currency context:", error));
    }, [client, context.currency]);

    useEffect(() => {
        const loadBundle = async () => {
            const c = context as ThemeContextBundle;
            if (c.bundleOptions.type === "existing") {
                const bundle = await client.getExistingBundle(c.bundleOptions.bundleId, undefined, undefined, {});
                setBundle(bundle);
            } else {
                const collectionId = getProductCollectionForNewBundle(context);
                console.log(`Creating new bundle with product collection: ${collectionId}`);
                const bundle = await client.getNewBundle(collectionId || undefined, undefined, {});
                setBundle(bundle);
            }
        };
        loadBundle();
    }, [client, context]);

    if (!bundle) {
        return (
            <div className="app-body">
                <LoadingOverlay />
            </div>
        );
    }

    return (
        <div className="app-body">
            <ClientProvider client={client}>
                <ActivationProvider activation={context.activation}>
                    <BundleProvider bundle={bundle}>
                        <ThemeConfigurationProvider configuration={context.configuration}>
                            <CurrencyProvider currencyContext={currencyContext}>
                                <PageHandler />
                            </CurrencyProvider>
                        </ThemeConfigurationProvider>
                    </BundleProvider>
                </ActivationProvider>
            </ClientProvider>
        </div>
    );
};

export default App;
