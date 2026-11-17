import { Bundle } from "@spiffcommerce/core";
import { createContext, FunctionComponent, useContext } from "react";

interface BundleContextType {
    bundle: Bundle;
    /** Replaces the bundle being worked on, such as when a draft is re-opened or an order is duplicated. */
    setBundle: (bundle: Bundle) => void;
}

const BundleContext = createContext<BundleContextType>({
    bundle: {} as Bundle,
    setBundle: () => {},
});

const useBundle = () => {
    const { bundle } = useContext(BundleContext);
    return bundle;
};

export const useSetBundle = () => useContext(BundleContext).setBundle;

export const BundleProvider: FunctionComponent<{
    bundle: Bundle;
    setBundle: (bundle: Bundle) => void;
    children: any;
}> = ({ bundle, setBundle, children }) => {
    return <BundleContext.Provider value={{ bundle, setBundle }}>{children}</BundleContext.Provider>;
};

export default useBundle;
