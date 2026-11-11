import {
    themeInstallConfigurationFieldsToRecordObject,
    type ThemeConfigurationPageSettings,
    type ThemeInstallConfigurationResource,
} from "@spiffcommerce/theme-bridge";
import { createContext, FunctionComponent, ReactNode, useContext, useMemo } from "react";
import { pageSettings as defaultPageSettings, type ThemeConfiguration } from "../configurationSchema";

const ThemeConfigurationContext = createContext<ThemeConfiguration>({});

const useThemeConfiguration = () => useContext(ThemeConfigurationContext);

/**
 * Applies the partner's page settings (which pages they've switched on or off, and the order of pages in each group)
 * on top of the theme's own description of its pages. The theme version's description is used when the platform
 * sends one, and otherwise the one in `configurationSchema.ts`.
 */
export const getMergedPageSettings = (
    configuration: ThemeInstallConfigurationResource | undefined,
): ThemeConfigurationPageSettings => {
    const base = configuration?.themeVersion.pageSettings ?? defaultPageSettings;
    const installed = configuration?.pageSettings;
    if (!installed) return base;
    return {
        pages: base.pages.map((page) => {
            const enabled = installed.pages?.find((installedPage) => installedPage.key === page.key)?.enabled;
            // The platform may send null for a page the partner hasn't touched.
            return { ...page, disabled: enabled != null ? !enabled : page.disabled };
        }),
        groups: base.groups.map((group) => {
            const pageOrder = installed.groups?.find((installedGroup) => installedGroup.key === group.key)?.pageOrder;
            return { ...group, pageKeys: pageOrder && pageOrder.length > 0 ? pageOrder : group.pageKeys };
        }),
    };
};

const PageSettingsContext = createContext<ThemeConfigurationPageSettings>(defaultPageSettings);

export const usePageSettings = () => useContext(PageSettingsContext);

/**
 * Whether the page with this key is switched on. Pages the theme doesn't describe are never on.
 */
export const usePageEnabled = (pageKey: string) => {
    const page = usePageSettings().pages.find((candidate) => candidate.key === pageKey);
    return !!page && !page.disabled;
};

export const ThemeConfigurationProvider: FunctionComponent<{
    configuration: ThemeInstallConfigurationResource | undefined;
    children: ReactNode;
}> = ({ configuration, children }) => {
    const themeConfiguration = useMemo<ThemeConfiguration>(
        () => (configuration ? themeInstallConfigurationFieldsToRecordObject(configuration.fields) : {}),
        [configuration],
    );
    const pageSettings = useMemo(() => getMergedPageSettings(configuration), [configuration]);
    return (
        <ThemeConfigurationContext.Provider value={themeConfiguration}>
            <PageSettingsContext.Provider value={pageSettings}>{children}</PageSettingsContext.Provider>
        </ThemeConfigurationContext.Provider>
    );
};

export default useThemeConfiguration;
