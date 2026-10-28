import { Variant } from "@spiffcommerce/core";
import { createContext, FunctionComponent, ReactNode, useCallback, useContext } from "react";
import useCurrency from "./useCurrency";

interface PricingContextType {
    showPricing: boolean;
    showPlus: boolean;
}

const PricingContext = createContext<PricingContextType>({ showPricing: false, showPlus: true });

/**
 * Returns a function producing the display price for a variant (e.g. "+ $5.00"), or undefined when
 * the variant is free or pricing isn't being shown / can't be formatted.
 */
const useVariantPrice = () => {
    const { showPricing, showPlus } = useContext(PricingContext);
    const formatPrice = useCurrency();
    return useCallback(
        (variant: Variant) => {
            const price = variant.getPrice();
            if (!showPricing || !formatPrice || !(price > 0)) return undefined;
            return `${showPlus ? "+ " : ""}${formatPrice(price)}`;
        },
        [showPricing, showPlus, formatPrice],
    );
};

export const PricingProvider: FunctionComponent<PricingContextType & { children: ReactNode }> = ({
    showPricing,
    showPlus,
    children,
}) => {
    return <PricingContext.Provider value={{ showPricing, showPlus }}>{children}</PricingContext.Provider>;
};

export default useVariantPrice;
