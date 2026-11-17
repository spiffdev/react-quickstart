import { Bundle } from "@spiffcommerce/core";
import { createContext, FunctionComponent, useContext } from "react";

interface BundleContextType {
    bundle: Bundle;
    /** Replaces the bundle being worked on, such as when a draft is re-opened or an order is duplicated. */
    setBundle: (bundle: Bundle) => void;
    /** Replaces the bundle with a new, empty one, as when a customer has just arrived. */
    startNewBundle: () => Promise<void>;
}

const BundleContext = createContext<BundleContextType>({
    bundle: {} as Bundle,
    setBundle: () => {},
    startNewBundle: async () => {},
});

const useBundle = () => {
    const { bundle } = useContext(BundleContext);
    return bundle;
};

export const useSetBundle = () => useContext(BundleContext).setBundle;

export const useStartNewBundle = () => useContext(BundleContext).startNewBundle;

export const BundleProvider: FunctionComponent<{
    bundle: Bundle;
    setBundle: (bundle: Bundle) => void;
    startNewBundle: () => Promise<void>;
    children: any;
}> = ({ bundle, setBundle, startNewBundle, children }) => {
    return <BundleContext.Provider value={{ bundle, setBundle, startNewBundle }}>{children}</BundleContext.Provider>;
};

export default useBundle;
