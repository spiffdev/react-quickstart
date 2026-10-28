import { Bundle } from "@spiffcommerce/core";
import { createContext, FunctionComponent, useContext } from "react";

interface BundleContextType {
    bundle: Bundle;
}

const BundleContext = createContext<BundleContextType>({
    bundle: {} as Bundle,
});

const useBundle = () => {
    const { bundle } = useContext(BundleContext);
    return bundle;
};

export const BundleProvider: FunctionComponent<{ bundle: Bundle; children: any }> = ({ bundle, children }) => {
    return <BundleContext.Provider value={{ bundle }}>{children}</BundleContext.Provider>;
};

export default useBundle;
