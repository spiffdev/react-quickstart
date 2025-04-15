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
import { configurationSchema } from "./configurationSchema";
import App from "./app";

const getHashQueryParams = () => {
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
    const queryParams = getHashQueryParams();
    // this would break if not dynamic, since the package is only a dev dependency
    import("@spiffcommerce/theme-bridge").then((themeDev) => {
        const devConfig: Partial<ThemeInstallConfigurationResource> = __DEV_CONFIGURATION__
            ? themeInstallConfigurationGraphQlToResource(__DEV_CONFIGURATION__)
            : {};
        const configurationBase = themeDev.exampleThemeInstallConfig({});
        const baseOptions: Pick<SpiffDevOptions, "applicationKey" | "configuration"> = {
            applicationKey: import.meta.env.VITE_APPLICATION_KEY || "",
            configuration: themeDev.exampleThemeInstallConfig({
                ...themeDev.getDefaultsForSchema(configurationSchema),
                fields: [...configurationBase.fields, ...(devConfig.fields ?? [])],
            }),
        };
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
                integrationProductId: import.meta.env.VITE_INTEGRATION_PRODUCT_ID,
            };
        }
        const devOptions: SpiffDevOptions = {
            ...baseOptions,
            queryParams,
            type: "bundle",
            bundleOptions,
        };

        themeDev.setSpiffDevOptions("app", devOptions);
        const spiffThemeLoader = (window as any).SpiffThemeLoader as SpiffThemeLoader;
        spiffThemeLoader.getContext().then((context) => {
            const root = createRoot(context.container);
            root.render(<App context={context} />);
        });
    });
} else {
    const spiffThemeLoader = (window as any).SpiffThemeLoader as SpiffThemeLoader;
    spiffThemeLoader.getContext().then((context) => {
        const root = createRoot(context.container);
        root.render(<App context={context} />);
    });
}
