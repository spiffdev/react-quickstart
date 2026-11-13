import { FunctionComponent, ReactNode, useEffect, useMemo, useState } from "react";
import {
    SpiffThemeLoader,
    ThemeContext,
    ThemeContextBundle,
    themeInstallConfigurationFieldsToRecordObject,
} from "@spiffcommerce/theme-bridge";
import {
    ActivationData,
    Bundle,
    CurrencyContext,
    SpiffCommerceClient,
    spiffCoreConfiguration,
} from "@spiffcommerce/core";
import { BundleProvider } from "./hooks/useBundle";
import { CurrencyProvider } from "./hooks/useCurrency";
import { ThemeProvider } from "./hooks/useTheme";
import { ThemeConfigurationProvider } from "./hooks/useThemeConfiguration";
import PageHandler from "./Pages/PageHandler";
import { ActivationProvider } from "./hooks/useActivation";
import type { ThemeConfiguration } from "./configurationSchema";
import { ClientProvider } from "./hooks/useClient";
import LoadingOverlay from "./Pages/components/LoadingOverlay";
import ErrorScreen from "./components/ErrorScreen";

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
        // Only overridden when provided, otherwise core's default editor is used.
        if (import.meta.env.VITE_EDITOR_URL) {
            spiffCoreConfiguration.setEditorUrl(import.meta.env.VITE_EDITOR_URL);
        }
        return client;
    });

    const [bundle, setBundle] = useState<Bundle | undefined>(undefined);
    const [currencyContext, setCurrencyContext] = useState<CurrencyContext | undefined>(undefined);
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadAttempt, setLoadAttempt] = useState(0);

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

    // Test bundles are excluded from reporting and billing.
    const enableTestOrders = useMemo(
        () =>
            context.configuration
                ? !!(themeInstallConfigurationFieldsToRecordObject(context.configuration.fields) as ThemeConfiguration)
                      .enableTestOrders
                : false,
        [context.configuration],
    );

    useEffect(() => {
        let cancelled = false;
        setLoadFailed(false);

        const loadBundle = async () => {
            const c = context as ThemeContextBundle;
            if (c.bundleOptions.type === "existing") {
                return client.getExistingBundle(c.bundleOptions.bundleId, undefined, undefined, {
                    test: enableTestOrders || undefined,
                });
            }
            const collectionId = getProductCollectionForNewBundle(context);
            return client.getNewBundle(
                collectionId || undefined,
                undefined,
                { test: enableTestOrders },
                context.activation?.id,
            );
        };

        loadBundle()
            .then((loaded) => {
                if (!cancelled) setBundle(loaded);
            })
            .catch((error) => {
                console.error("Error loading the bundle:", error);
                if (!cancelled) setLoadFailed(true);
            });

        return () => {
            cancelled = true;
        };
    }, [client, context, enableTestOrders, loadAttempt]);

    // In single product mode the product may already be chosen, such as by the e-commerce product page.
    const bundleOptions = (context as ThemeContextBundle).bundleOptions;
    const presetProduct =
        context.type === "bundle" && bundleOptions.type === "new" && bundleOptions.singleProductMode
            ? bundleOptions.collectionProduct
            : undefined;

    let content: ReactNode;
    if (loadFailed) {
        content = (
            <ErrorScreen
                message="We couldn't load your bundle. Please check your connection and try again."
                onRetry={() => setLoadAttempt((attempt) => attempt + 1)}
            />
        );
    } else if (!bundle) {
        content = <LoadingOverlay />;
    } else {
        content = (
            <ClientProvider client={client}>
                <ActivationProvider activation={context.activation}>
                    <BundleProvider bundle={bundle}>
                        <CurrencyProvider currencyContext={currencyContext}>
                            <PageHandler collectionProduct={presetProduct} />
                        </CurrencyProvider>
                    </BundleProvider>
                </ActivationProvider>
            </ClientProvider>
        );
    }

    // The styling wraps every state, so even the loading and error screens match the configured look.
    return (
        <ThemeConfigurationProvider configuration={context.configuration}>
            <ThemeProvider container={context.container}>
                <div className="app-body">{content}</div>
            </ThemeProvider>
        </ThemeConfigurationProvider>
    );
};

export default App;
