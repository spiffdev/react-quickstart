import {
    themeInstallConfigurationFieldsToRecordObject,
    type ThemeInstallConfigurationResource,
} from "@spiffcommerce/theme-bridge";
import { createContext, FunctionComponent, ReactNode, useContext, useMemo } from "react";
import type { ThemeConfiguration } from "../configurationSchema";

const ThemeConfigurationContext = createContext<ThemeConfiguration>({});

const useThemeConfiguration = () => useContext(ThemeConfigurationContext);

export const ThemeConfigurationProvider: FunctionComponent<{
    configuration: ThemeInstallConfigurationResource | undefined;
    children: ReactNode;
}> = ({ configuration, children }) => {
    const themeConfiguration = useMemo<ThemeConfiguration>(
        () => (configuration ? themeInstallConfigurationFieldsToRecordObject(configuration.fields) : {}),
        [configuration],
    );
    return (
        <ThemeConfigurationContext.Provider value={themeConfiguration}>{children}</ThemeConfigurationContext.Provider>
    );
};

export default useThemeConfiguration;
