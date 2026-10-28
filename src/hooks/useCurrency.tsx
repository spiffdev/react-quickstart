import { CurrencyContext, CurrencyService } from "@spiffcommerce/core";
import { createContext, FunctionComponent, ReactNode, useContext, useMemo } from "react";

const currencyService = new CurrencyService();

const CurrencyReactContext = createContext<CurrencyContext | undefined>(undefined);

/**
 * Returns a function which formats an amount (in the partner currency's minor units) for display in the
 * presentment currency, or undefined when no presentment currency is available.
 */
const useCurrency = () => {
    const currencyContext = useContext(CurrencyReactContext);
    return useMemo(() => {
        if (!currencyContext) return undefined;
        return (amount: number) =>
            currencyService.formatCurrencyForDisplay(
                currencyContext.code(),
                currencyContext.getConvertedSubunits(amount),
            );
    }, [currencyContext]);
};

export const CurrencyProvider: FunctionComponent<{
    currencyContext: CurrencyContext | undefined;
    children: ReactNode;
}> = ({ currencyContext, children }) => {
    return <CurrencyReactContext.Provider value={currencyContext}>{children}</CurrencyReactContext.Provider>;
};

export default useCurrency;
