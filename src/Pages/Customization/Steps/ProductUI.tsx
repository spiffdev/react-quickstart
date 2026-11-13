import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nameTransaction, ProductStepHandle, Transaction, Variant, WorkflowExperience } from "@spiffcommerce/core";
import styled from "styled-components";
import useBundle from "../../../hooks/useBundle";
import Typography from "../../../components/typography";
import Button from "../../../components/button";
import VariantGallery from "../components/VariantGallery";

const Container = styled.div`
    padding: 16px;
    box-sizing: border-box;
    width: 100%;
`;

const Hint = styled(Typography)<{ $error?: boolean }>`
    margin: 12px 0 0;
    font-size: 14px;
    color: ${(props) => (props.$error ? "#c0392b" : "#666")};
`;

const Added = styled.ul`
    list-style: none;
    margin: 16px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const AddedItem = styled.li`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
`;

const AddedName = styled.span`
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const Quantity = styled.span`
    font-size: 14px;
    color: #666;
`;

const SmallButton = styled(Button)`
    padding: 6px 12px;
    font-size: 14px;
`;

/** The number of products chosen in a step, counting quantities. */
export const countProducts = (step: ProductStepHandle) =>
    step.getChildTransactions().reduce((total, transaction) => total + (transaction.quantity || 1), 0);

const ProductUI: FunctionComponent<{
    step: ProductStepHandle;
    onActivation?: () => void;
    /** Opens one of the bundle's other experiences, so a chosen product can be personalised. */
    onOpenExperience?: (experience: WorkflowExperience) => void;
    /** Called with true while products are being added or removed (including naming them), and false once done. */
    onUpdatingChange?: (updating: boolean) => void;
}> = ({ step, onActivation, onOpenExperience, onUpdatingChange }) => {
    const bundle = useBundle();
    const [variants, setVariants] = useState<Variant[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);
    // Bumped whenever the bundle's products change, so the chosen products are read again.
    const [revision, setRevision] = useState(0);
    // Products are only shown once they're fully set up (named), so bundle events are ignored in the meantime.
    const updating = useRef(false);

    useEffect(() => {
        step.getAvailableVariants()
            .then((available) => setVariants(available || []))
            .catch((err) => console.error("Error loading product variants:", err))
            .finally(() => setLoading(false));
    }, [step]);

    useEffect(() => {
        const refresh = () => {
            if (!updating.current) setRevision((current) => current + 1);
        };
        bundle.addEventListener("workflow-experience-added", refresh);
        bundle.addEventListener("workflow-experience-removed", refresh);
        return () => {
            bundle.removeEventListener("workflow-experience-added", refresh);
            bundle.removeEventListener("workflow-experience-removed", refresh);
        };
    }, [bundle]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const children = useMemo(() => step.getChildTransactions(), [step, revision]);
    const count = children.reduce((total, transaction) => total + (transaction.quantity || 1), 0);
    const min = step.getMin();
    const max = step.getMax();
    const atMax = max !== undefined && max !== null && count >= max;

    const run = useCallback(
        async (action: () => Promise<void>) => {
            if (busy) return;
            setBusy(true);
            setError(undefined);
            updating.current = true;
            onUpdatingChange?.(true);
            onActivation?.();
            try {
                await action();
            } catch (err) {
                console.error("Error updating products:", err);
                setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
            } finally {
                // Changing the quantity of an existing product doesn't raise a bundle event.
                updating.current = false;
                setRevision((current) => current + 1);
                setBusy(false);
                onUpdatingChange?.(false);
            }
        },
        [busy, onActivation, onUpdatingChange],
    );

    // Each personalisable product is its own design, so repeats of a product are numbered to tell them apart.
    const handleAdd = useCallback(
        (variant: Variant) =>
            run(async () => {
                const before = new Set(step.getChildTransactions().map((transaction) => transaction.id));
                await step.addProduct(variant);
                const added = step.getChildTransactions().filter((transaction) => !before.has(transaction.id));
                const sameProduct = step
                    .getChildTransactions()
                    .filter((transaction) => transaction.product?.id === added[0]?.product?.id);
                if (added.length !== 1 || sameProduct.length < 2) return;
                const name = `${added[0].product?.name ?? variant.getName()} (${sameProduct.length})`;
                try {
                    // We only rename the new transaction just for visual clarity with our current UI.
                    // Different themes may not display the names of the items at all, so this isn't required at all.
                    await nameTransaction(added[0].id, name);
                    added[0].designName = name;
                } catch (err) {
                    // The product is still added; it just keeps the shared name.
                    console.error("Error naming product:", err);
                }
            }),
        [run, step],
    );
    const handleRemove = useCallback(
        (transaction: Transaction) => run(() => step.removeProduct(transaction.id)),
        [run, step],
    );

    const handleOpen = useCallback(
        (transaction: Transaction) => {
            const experience = bundle.getWorkflowExperiences().find((e) => e.getTransaction().id === transaction.id);
            if (experience) onOpenExperience?.(experience);
        },
        [bundle, onOpenExperience],
    );

    if (loading) {
        return <Container data-test-step-type="product">Loading...</Container>;
    }

    if (variants.length === 0) {
        return null;
    }

    const requirement =
        max !== undefined && max !== null
            ? min > 0
                ? `Choose ${min === max ? max : `${min} to ${max}`}.`
                : `Choose up to ${max}.`
            : min > 0
              ? `Choose at least ${min}.`
              : undefined;

    return (
        <Container data-test-step-type="product">
            {requirement && (
                <Hint variant="p" style={{ margin: "0 0 12px" }}>
                    {requirement}
                </Hint>
            )}
            <VariantGallery
                variants={variants}
                disabled={busy || atMax}
                searchEnabled={step.isSearchBarEnabled()}
                categoriesEnabled={step.isCategoryFilterEnabled()}
                onSelect={handleAdd}
            />
            {error && (
                <Hint variant="p" $error>
                    {error}
                </Hint>
            )}
            {children.length > 0 && (
                <Added>
                    {children.map((transaction) => (
                        <AddedItem key={transaction.id}>
                            <AddedName>{transaction.designName || transaction.product?.name || "Product"}</AddedName>
                            {(transaction.quantity || 1) > 1 && <Quantity>× {transaction.quantity}</Quantity>}
                            {!!transaction.product?.workflows?.length && onOpenExperience && (
                                <SmallButton type="button" onClick={() => handleOpen(transaction)}>
                                    Personalise
                                </SmallButton>
                            )}
                            <SmallButton type="button" disabled={busy} onClick={() => handleRemove(transaction)}>
                                Remove
                            </SmallButton>
                        </AddedItem>
                    ))}
                </Added>
            )}
        </Container>
    );
};

export default ProductUI;
