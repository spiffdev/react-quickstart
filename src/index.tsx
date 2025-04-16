import "./index.css"; // Ensure this is at top of file so its css data is imported before all others
import {
    // type ThemeContextTransaction,
    type SpiffThemeLoader,
    type SpiffDevOptions,
    type ThemeContextBundleOptions,
    themeInstallConfigurationGraphQlToResource,
    ThemeInstallConfigurationResource,
} from "@spiffcommerce/theme-bridge";
import { createRoot } from "react-dom/client";
import App from "./app";
import { getIntegration, getOverrideThemeConfiguration, spiffCoreConfiguration } from "@spiffcommerce/core";

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
 * - When __LOCAL_DEV_CONFIGURATION__ is available via a json file matching the name of the env file being used.
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
            ? loadFromLocalConfigFile(themeBridge)
            : await loadFromSpiffCommerce(),
    };
    let devOptions: SpiffDevOptions;
    const contextType = import.meta.env.VITE_CONTEXT_TYPE || "transaction";
    if (contextType === "transaction") {
        devOptions = {
            ...baseOptions,
            currency: "AUD",
            queryParams,
            type: "transaction",
            workflowOptions: {
                ...(import.meta.env.VITE_TRANSACTION_ID
                    ? {
                          type: "transaction",
                          transactionId: import.meta.env.VITE_TRANSACTION_ID,
                      }
                    : {
                          workflowId: import.meta.env.VITE_WORKFLOW_ID || "",
                          integrationProductId: import.meta.env.VITE_INTEGRATION_PRODUCT_ID || "",
                          type: "integration",
                      }),
            },
        };
    } else {
        const bundleId = import.meta.env.VITE_BUNDLE_ID;
        let bundleOptions: ThemeContextBundleOptions;
        if (bundleId) {
            bundleOptions = {
                type: "existing",
                bundleId,
            };
        } else {
            bundleOptions = {
                type: "new",
                productCollectionId: import.meta.env.VITE_PRODUCT_COLLECTION_ID,
            };
        }
        devOptions = {
            ...baseOptions,
            currency: "AUD",
            queryParams,
            type: "bundle",
            bundleOptions,
        };
    }
    themeBridge.setSpiffDevOptions("app", devOptions);
};

const loadFromLocalConfigFile = (themeDev: any): ThemeInstallConfigurationResource => {
    console.log("Loading configuration from local file");
    // __LOCAL_DEV_CONFIGURATION__ is a global variable that is set by the vite plugin. It is the content of the local env configuration json file.
    const configurationBase = themeDev.exampleThemeInstallConfig({});
    const devConfig: Partial<ThemeInstallConfigurationResource> = __LOCAL_DEV_CONFIGURATION__
        ? themeInstallConfigurationGraphQlToResource(__LOCAL_DEV_CONFIGURATION__)
        : {};
    return {
        ...configurationBase,
        ...devConfig,
        fields: [...configurationBase.fields, ...(devConfig.fields ?? [])],
    };
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
