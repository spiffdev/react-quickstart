import "./reset.css";
import "./index.css"; // Ensure this is at top of file so its css data is imported before all others
import {
    // type ThemeContextTransaction,
    type SpiffThemeLoader,
    type SpiffDevOptions,
    type ThemeContextBundleOptions,
    themeInstallConfigurationGraphQlToResource,
    type ThemeInstallConfigurationOverrides,
    ThemeInstallConfigurationResource,
    ThemeContextBundleOptionsNew,
} from "@spiffcommerce/theme-bridge";
import { createRoot } from "react-dom/client";
import App from "./App";
import {
    ActivationData,
    CollectionProduct,
    getActivation,
    getIntegration,
    getIntegrationProducts,
    setApplicationKey,
    getOverrideThemeConfiguration,
    spiffCoreConfiguration,
} from "@spiffcommerce/core";

const getQueryParams = () => {
    const hash = window.location.hash;
    const query = hash.split("?")[1];
    if (!query) {
        return {};
    }
    return query.split("&").reduce((acc, pair) => {
        const [key, value] = pair.split("=");
        return {
            ...acc,
            [key]: value,
        };
    }, {});
};

if (import.meta.env.DEV) {
    // this would break if not dynamic, since the package is only a dev dependency
    import("@spiffcommerce/theme-bridge").then((themeBridge) => {
        loadDevConfiguration(themeBridge).then(() => {
            const spiffThemeLoader = (window as any).SpiffThemeLoader as SpiffThemeLoader;
            spiffThemeLoader.getContext().then((context) => {
                const root = createRoot(context.container);
                root.render(<App context={context} />);
            });
        });
    });
} else {
    const spiffThemeLoader = (window as any).SpiffThemeLoader as SpiffThemeLoader;
    spiffThemeLoader.getContext().then((context) => {
        const root = createRoot(context.container);
        root.render(<App context={context} />);
    });
}

/**
 * When in a development environment, load the configuration most relevant to the users needs.
 * This will either load the configuration from the local file or from the Spiff Commerce API.
 * The configuration is loaded in the following order:
 * - When __LOCAL_DEV_CONFIGURATION__ is available via a json file matching the name of the env file being used
 *   (e.g. .env.dev.json). It lists only the overrides to the schema's defaults.
 * - When VITE_THEME_INSTALL_ID and VITE_THEME_CONFIGURATION_ID are provided, it will load the explicit configuration from the Spiff Commerce API.
 * - When VITE_APPLICATION_KEY is provided, it will load the configuration from the Spiff Commerce API.
 * @param themeBridge Used to load the configuration from the Spiff Commerce API
 */
const loadDevConfiguration = async (themeBridge: any) => {
    const queryParams = getQueryParams();

    spiffCoreConfiguration.setServerUrl(import.meta.env.VITE_SERVER_URL);

    const baseOptions: Pick<SpiffDevOptions, "applicationKey" | "configuration"> = {
        applicationKey: import.meta.env.VITE_APPLICATION_KEY || "",
        configuration: __LOCAL_DEV_CONFIGURATION__
            ? await loadFromLocalConfigFile(themeBridge)
            : await loadFromSpiffCommerce(),
    };
    const bundleId = import.meta.env.VITE_BUNDLE_ID;
    const activationId = import.meta.env.VITE_ACTIVATION_ID;
    let activation: ActivationData | undefined;
    let bundleOptions: ThemeContextBundleOptions;
    if (bundleId) {
        bundleOptions = {
            type: "existing",
            bundleId,
        };
    } else if (activationId) {
        // The server decides which of a product's integrations is the current one from the application key, so it has to
        // be known before anything is fetched. The client does this later, which is too late for the activation.
        if (baseOptions.applicationKey) setApplicationKey(baseOptions.applicationKey);
        // In production the integration product comes from the e-commerce product page that launched the theme. For
        // local development it can be supplied here. It's needed up front, as the activation only includes the
        // products asked for.
        const integrationProductId = import.meta.env.VITE_INTEGRATION_PRODUCT_ID;
        let productId: string | undefined;
        if (integrationProductId) {
            productId = (await getIntegrationProducts([integrationProductId]))[0]?.product?.id;
            if (!productId) {
                throw new Error(`Failed to find integration product ${integrationProductId}`);
            }
        }
        activation = await getActivation(activationId, productId ? [productId] : undefined);
        if (!activation) {
            throw new Error(`Failed to find activation ${activationId}`);
        }
        if (activation.singleProductMode) {
            // As the editor does: the integration product preselects its product from the activation's collections.
            const activationCollections = activation.activationProductCollections ?? [];
            const findProduct = (apc: (typeof activationCollections)[number]) =>
                [apc.productCollection.productCollectionProducts]
                    .flat()
                    .find((p) => !!productId && p?.productId === productId);
            const matchedCollection = productId ? activationCollections.find((apc) => !!findProduct(apc)) : undefined;
            const matchedProduct = matchedCollection ? findProduct(matchedCollection) : undefined;
            if (integrationProductId && !matchedProduct) {
                throw new Error(
                    `Integration product ${integrationProductId} is not in a collection of Activation "${activation.name}" (${activation.id}).`,
                );
            }

            const productCollectionId =
                (matchedCollection ?? activationCollections[0])?.productCollection.id ||
                import.meta.env.VITE_PRODUCT_COLLECTION_ID;

            if (!productCollectionId) {
                throw new Error(
                    `Unable to resolve a product collection for Activation "${activation.name}" (${activation.id}) which is in Single Product Mode.`,
                );
            }

            bundleOptions = {
                type: "new",
                productCollectionId,
                singleProductMode: activation.singleProductMode,
                ...(matchedProduct && { collectionProduct: new CollectionProduct(matchedProduct) }),
            } as ThemeContextBundleOptionsNew;
        } else {
            bundleOptions = {
                type: "new",
                singleProductMode: false,
            } as ThemeContextBundleOptionsNew;
        }
    } else {
        throw new Error("You must provide either a VITE_BUNDLE_ID or VITE_ACTIVATION_ID");
    }
    const devOptions: SpiffDevOptions = {
        ...baseOptions,
        currency: "AUD",
        queryParams,
        type: "bundle",
        bundleOptions,
        activation,
    };
    themeBridge.setSpiffDevOptions("app", devOptions);
};

const loadFromLocalConfigFile = async (themeBridge: any): Promise<ThemeInstallConfigurationResource> => {
    console.log("Loading configuration from local file");
    // __LOCAL_DEV_CONFIGURATION__ is a global variable that is set by the vite plugin. It is the content of the local
    // env configuration json file, which only lists the overrides to apply on top of the schema's defaults:
    // { "fields": { "<field key>": <value> }, "pageSettings": { "pages": { "<page key>": { "enabled": true } } } }
    const overrides: ThemeInstallConfigurationOverrides = __LOCAL_DEV_CONFIGURATION__;
    // Imported here as the schema needs theme-bridge at runtime, which is only available during development.
    const { configurationSchema, pageSettings } = await import("./configurationSchema");
    return themeBridge.generateThemeInstallConfigurationFromOverrides({
        schema: configurationSchema,
        pageSettings,
        overrides,
    });
};

const loadFromSpiffCommerce = async () => {
    console.log("Loading configuration from Spiff Commerce");
    const applicationKey = import.meta.env.VITE_APPLICATION_KEY;
    const overrideThemeInstallId = import.meta.env.VITE_THEME_INSTALL_ID;
    const overrideThemeConfigurationId = import.meta.env.VITE_THEME_CONFIGURATION_ID;
    // We expect an application key.
    if (!applicationKey) throw new Error("Failed to resolve application key");
    // If an overriding theme has been specified, pull this first.
    if (overrideThemeInstallId && overrideThemeConfigurationId) {
        const theme = await getOverrideThemeConfiguration(overrideThemeConfigurationId, overrideThemeInstallId);
        if (theme) {
            return themeInstallConfigurationGraphQlToResource(theme);
        }
    }
    // Pull information about the integration instead using the application key
    const currentIntegration = await getIntegration(applicationKey, overrideThemeConfigurationId);
    if (currentIntegration?.marketplaceThemeInstallConfiguration) {
        return themeInstallConfigurationGraphQlToResource(currentIntegration?.marketplaceThemeInstallConfiguration);
    }
    throw new Error("Failed to resolve valid configuration for local experience!");
};
