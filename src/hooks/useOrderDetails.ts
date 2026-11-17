import { useMemo } from "react";
import { orderDetailFields, type OrderDetailField } from "../utils/orderDetails";
import useThemeConfiguration from "./useThemeConfiguration";

/** The order details customers are asked for. None unless the corporate portal is on. */
const useOrderDetailFields = (): OrderDetailField[] => {
    const { enableCorporatePortal, portalOrderName, portalPurchaseOrder, portalDispatchDate } = useThemeConfiguration();
    return useMemo(
        () =>
            enableCorporatePortal
                ? orderDetailFields({
                      name: portalOrderName,
                      purchaseOrder: portalPurchaseOrder,
                      dispatchDate: portalDispatchDate,
                  })
                : [],
        [enableCorporatePortal, portalDispatchDate, portalOrderName, portalPurchaseOrder],
    );
};

export default useOrderDetailFields;
