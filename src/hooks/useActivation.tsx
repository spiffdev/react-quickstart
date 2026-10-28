import { ActivationData } from "@spiffcommerce/core";
import { createContext, FunctionComponent, useContext } from "react";

interface ActivationDataContextType {
    activation: ActivationData;
}

const ActivationDataContext = createContext<ActivationDataContextType>({
    activation: {} as ActivationData,
});

const useActivation = () => {
    const { activation } = useContext(ActivationDataContext);
    return activation;
};

export const ActivationProvider: FunctionComponent<{ activation: ActivationData; children: any }> = ({
    activation,
    children,
}) => {
    return <ActivationDataContext.Provider value={{ activation }}>{children}</ActivationDataContext.Provider>;
};

export default useActivation;
