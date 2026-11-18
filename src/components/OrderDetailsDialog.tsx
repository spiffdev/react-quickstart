import { FunctionComponent } from "react";
import useBundle from "../hooks/useBundle";
import useOrderDetailFields from "../hooks/useOrderDetails";
import { applyOrderDetails, readOrderDetails, type OrderDetails } from "../utils/orderDetails";
import OrderDetailsForm from "./OrderDetailsForm";
import { Backdrop, Dialog, Header, Muted, TextButton, Title } from "./dialogParts";

/** The order details of the current bundle, which the customer can offer or change at any time. */
const OrderDetailsDialog: FunctionComponent<{
    /** Called with whether the details were saved, once the dialog is done with. */
    onClose: (saved: boolean) => void;
}> = ({ onClose }) => {
    const bundle = useBundle();
    const fields = useOrderDetailFields();
    const collection = bundle.getProductCollection()?.getResource();

    const save = async (details: OrderDetails) => {
        await applyOrderDetails(bundle, fields, details);
        onClose(true);
    };

    return (
        <Backdrop onDismiss={() => onClose(false)}>
            <Dialog role="dialog" aria-modal="true" aria-labelledby="order-details-title">
                <Header>
                    <Title id="order-details-title">Order details</Title>
                    <TextButton type="button" onClick={() => onClose(false)}>
                        Cancel
                    </TextButton>
                </Header>
                <Muted>Fields marked * are needed before the design can be completed.</Muted>
                <OrderDetailsForm
                    fields={fields}
                    initialValues={readOrderDetails(bundle)}
                    collection={collection}
                    submitLabel="Save"
                    submittingLabel="Saving..."
                    onSubmit={save}
                />
            </Dialog>
        </Backdrop>
    );
};

export default OrderDetailsDialog;
