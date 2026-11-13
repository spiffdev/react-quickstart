import { FunctionComponent, useCallback, useEffect, useMemo, useState } from "react";
import { ProductStepHandle, Transaction, Variant, WorkflowExperience } from "@spiffcommerce/core";
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
    margin: 0 0 12px;
    font-size: 14px;
    color: ${(props) => (props.$error ? "#c0392b" : "#666")};
`;

const Added = styled.ul`
    list-style: none;
    margin: 0 0 16px;
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
}> = ({ step, onActivation, onOpenExperience }) => {
    const bundle = useBundle();
    const [variants, setVariants] = useState<Variant[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);
    // Bumped whenever the bundle's products change, so the chosen products are read again.
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        step.getAvailableVariants()
            .then((available) => setVariants(available || []))
            .catch((err) => console.error("Error loading product variants:", err))
            .finally(() => setLoading(false));
    }, [step]);

    useEffect(() => {
        const refresh = () => setRevision((current) => current + 1);
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
            onActivation?.();
            try {
                await action();
            } catch (err) {
                console.error("Error updating products:", err);
                setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
            } finally {
                // Changing the quantity of an existing product doesn't raise a bundle event.
                setRevision((current) => current + 1);
                setBusy(false);
            }
        },
        [busy, onActivation],
    );

    const handleAdd = useCallback((variant: Variant) => run(() => step.addProduct(variant)), [run, step]);
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
            {requirement && <Hint variant="p">{requirement}</Hint>}
            {children.length > 0 && (
                <Added>
                    {children.map((transaction) => (
                        <AddedItem key={transaction.id}>
                            <AddedName>{transaction.product?.name || "Product"}</AddedName>
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
            {error && (
                <Hint variant="p" $error>
                    {error}
                </Hint>
            )}
            <VariantGallery
                variants={variants}
                disabled={busy || atMax}
                searchEnabled={step.isSearchBarEnabled()}
                categoriesEnabled={step.isCategoryFilterEnabled()}
                onSelect={handleAdd}
            />
        </Container>
    );
};

export default ProductUI;
