import { FunctionComponent, useState } from "react";
import { SpiffThemeLoader, ThemeContext } from "@spiffcommerce/theme-bridge";
import { SpiffCommerceClient } from "@spiffcommerce/core";

const App: FunctionComponent<{
    context: ThemeContext;
}> = ({ context }) => {
    const [client] = useState<SpiffCommerceClient | null>(() => {
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

    console.log(client);

    return <div className="app-body">Hello</div>;
};

export default App;
