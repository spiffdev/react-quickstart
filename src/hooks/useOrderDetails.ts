import { useMemo } from "react";
import { orderDetailFields, type OrderDetailField } from "../utils/orderDetails";
import useThemeConfiguration from "./useThemeConfiguration";

/** The order details customers are asked for. None unless the user portal is on. */
const useOrderDetailFields = (): OrderDetailField[] => {
    const { enableUserPortal, portalOrderName, portalPurchaseOrder, portalDispatchDate } = useThemeConfiguration();
    return useMemo(
        () =>
            enableUserPortal
                ? orderDetailFields({
                      name: portalOrderName,
                      purchaseOrder: portalPurchaseOrder,
                      dispatchDate: portalDispatchDate,
                  })
                : [],
        [enableUserPortal, portalDispatchDate, portalOrderName, portalPurchaseOrder],
    );
};

export default useOrderDetailFields;
