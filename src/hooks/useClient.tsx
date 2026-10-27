import { SpiffCommerceClient } from "@spiffcommerce/core";
import { createContext, FunctionComponent, useContext } from "react";

interface ClientContextType {
    client: SpiffCommerceClient;
}

const ClientContext = createContext<ClientContextType>({
    client: {} as SpiffCommerceClient,
});

const useClient = () => {
    const { client } = useContext(ClientContext);
    return client;
};

export const ClientProvider: FunctionComponent<{ client: SpiffCommerceClient; children: any }> = ({
    client,
    children,
}) => {
    return <ClientContext.Provider value={{ client }}>{children}</ClientContext.Provider>;
};

export default useClient;
