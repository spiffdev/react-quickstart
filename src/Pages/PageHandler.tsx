import { FunctionComponent, useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { UserRound } from "lucide-react";
import useBundle from "../hooks/useBundle";
import ProductCollectionSelector from "./ProductCollectionSelector";
import { CollectionProduct, ProductCollection, ProductWorkflow, WorkflowExperience } from "@spiffcommerce/core";
import ProductSelector from "./ProductSelector";
import useClient from "../hooks/useClient";
import WorkflowSelector from "./WorkflowSelector";
import Customization from "./Customization";
import ErrorBanner from "../components/ErrorBanner";
import ExperienceSwitcher from "./components/ExperienceSwitcher";
import PageStepper from "./components/PageStepper";
import { ConversionDataType, ConversionLocation, type SpiffThemeLoader } from "@spiffcommerce/theme-bridge";
import { StakeholderType, type Customer } from "@spiffcommerce/core";
import TestOrderBanner from "../components/TestOrderBanner";
import ConfirmReplaceDialog, { type ReplaceSubject } from "../components/ConfirmReplaceDialog";
import useThemeConfiguration from "../hooks/useThemeConfiguration";
import { fieldId, type QuoteDetails } from "./Customization/components/QuoteForm";
import ConversionDialog from "../components/ConversionDialog";

// A text button for the stepper bar, so it reads as a link rather than a call to action.
const DetailsButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    font: inherit;
    font-size: 14px;
    color: var(--theme-primary-color);
    background: none;
    border: none;
    cursor: pointer;

    &:hover:not(:disabled) {
        text-decoration: underline;
    }

    &:disabled {
        color: #9e9e9e;
        cursor: default;
    }

    &:focus-visible {
        outline: 2px solid var(--theme-primary-color);
        outline-offset: 4px;
        border-radius: 4px;
    }
`;

type PageType = "collection" | "product" | "workflow" | "experience";

// The pages in the order the customer visits them, and the heading each is shown under.
const PAGE_STEPS: { page: PageType; label: string }[] = [
    { page: "collection", label: "Collection" },
    { page: "product", label: "Product" },
    { page: "workflow", label: "Design" },
    { page: "experience", label: "Personalise" },
];

const pageIndex = (page: PageType) => PAGE_STEPS.findIndex((step) => step.page === page);

const PageHandler: FunctionComponent<{}> = () => {
    const client = useClient();
    const bundle = useBundle();
    const { conversionConfiguration } = useThemeConfiguration();
    const [page, setPage] = useState<PageType>("collection");
    const [collection, setCollection] = useState<ProductCollection | undefined>(undefined);
    const [product, setProduct] = useState<CollectionProduct | undefined>(undefined);
    const [workflow, setWorkflow] = useState<ProductWorkflow | undefined>(undefined);
    // The experience shown on the personalise page.
    const [experience, setExperience] = useState<WorkflowExperience | undefined>(undefined);
    // The experience created by the current product and workflow selection, if any.
    const [selectionExperience, setSelectionExperience] = useState<WorkflowExperience | undefined>(undefined);
    // The furthest page the customer can return to using the stepper.
    const [reachedIndex, setReachedIndex] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
    // Experiences made by these pages in this visit. Only these are ever discarded by a new selection, so a
    // reloaded bundle's existing designs are never thrown away.
    const createdExperiences = useRef(new Set<WorkflowExperience>());
    // "Don't ask again" is deliberately held in memory only, so it lasts until the page is reloaded.
    const skipReplaceConfirmation = useRef(false);
    // The conversion prompt currently shown, and the locations it has already been shown at.
    const [pendingConversion, setPendingConversion] = useState<
        | { resolve: (completed: boolean) => void; manual?: boolean; quote?: boolean; initialValues?: QuoteDetails }
        | undefined
    >(undefined);
    // The bundle's owner, i.e. the customer whose details are already known.
    const [owner, setOwner] = useState<Customer | undefined>(undefined);
    const consumedConversionLocations = useRef(new Set<ConversionLocation>());
    const [pendingReplace, setPendingReplace] = useState<
        { subject: ReplaceSubject; resolve: (confirmed: boolean) => void } | undefined
    >(undefined);

    useEffect(() => {
        // Whenever the bundle changes (i.e. a new bundle is loaded) we need to reset
        const bundleCollection = bundle.getProductCollection();
        createdExperiences.current.clear();
        setErrorMessage(undefined);
        setCollection(bundleCollection);
        setProduct(undefined);
        setWorkflow(undefined);
        setSelectionExperience(undefined);

        // A reloaded bundle already has products, so pick up where the customer left off.
        const experiences = bundle.getWorkflowExperiences();
        if (experiences.length > 0) {
            setExperience(experiences[0]);
            setPage("experience");
            setReachedIndex(pageIndex("experience"));
        } else {
            setExperience(undefined);
            setPage(bundleCollection ? "product" : "collection");
            setReachedIndex(bundleCollection ? pageIndex("product") : pageIndex("collection"));
        }
    }, [bundle]);

    // Runs a change to the bundle. React state is only updated by `action` once every call it makes has succeeded,
    // so a failure leaves the page exactly as it was and the customer can simply try again.
    const attempt = useCallback(async (action: () => Promise<void>, failureMessage: string) => {
        setErrorMessage(undefined);
        try {
            await action();
        } catch (error) {
            console.error(failureMessage, error);
            setErrorMessage(failureMessage);
        }
    }, []);

    // A new selection replaces whatever the previous one led to. Nothing is cleared unless the removal succeeds.
    const removeSelectionExperience = useCallback(async () => {
        if (!selectionExperience) return;
        if (createdExperiences.current.has(selectionExperience)) {
            await bundle.removeWorkflowExperience(selectionExperience);
            createdExperiences.current.delete(selectionExperience);
        }
        setExperience((current) => (current === selectionExperience ? undefined : current));
        setSelectionExperience(undefined);
    }, [bundle, selectionExperience]);

    // Asks the customer to confirm before their current design is discarded. Resolves true when there is nothing
    // to discard, or they have chosen not to be asked again.
    const confirmReplace = useCallback(
        (subject: ReplaceSubject) => {
            if (!selectionExperience || skipReplaceConfirmation.current) return Promise.resolve(true);
            return new Promise<boolean>((resolve) => setPendingReplace({ subject, resolve }));
        },
        [selectionExperience],
    );

    const resolveReplace = (confirmed: boolean, dontAskAgain = false) => {
        if (confirmed && dontAskAgain) skipReplaceConfirmation.current = true;
        pendingReplace?.resolve(confirmed);
        setPendingReplace(undefined);
    };

    // Creates the new experience before the previous one is removed, so a failure never leaves the customer without one.
    const startExperience = useCallback(
        async (selectedProduct: CollectionProduct, selectedWorkflow: ProductWorkflow) => {
            const [created] = await client.getWorkflowExperiences([
                {
                    type: "integration",
                    workflowId: selectedWorkflow.getId(),
                    integrationProductId: selectedProduct.getCurrentIntegration().id,
                },
            ]);
            if (!created) {
                throw new Error("No workflow experience was created.");
            }
            await bundle.addWorkflowExperience(created);
            createdExperiences.current.add(created);

            let leftoverWarning: string | undefined;
            try {
                await removeSelectionExperience();
            } catch (error) {
                console.error("Error removing the previous design from the bundle:", error);
                leftoverWarning =
                    "Your new design is ready, but the previous one could not be removed from your bundle.";
            }

            setProduct(selectedProduct);
            setWorkflow(selectedWorkflow);
            setSelectionExperience(created);
            setExperience(created);
            setReachedIndex(pageIndex("experience"));
            setPage("experience");
            if (leftoverWarning) {
                setErrorMessage(leftoverWarning);
            }
        },
        [bundle, client, removeSelectionExperience],
    );

    const handleCollectionSelected = useCallback(
        (selected: ProductCollection) =>
            attempt(async () => {
                if (collection?.getId() === selected.getId()) {
                    // Nothing has changed, so keep everything the customer has already chosen.
                    setReachedIndex((reached) => Math.max(reached, pageIndex("product")));
                    setPage("product");
                    return;
                }

                if (!(await confirmReplace("collection"))) return;

                // Assigning is safe to repeat, so if removing the old design fails the customer can just try again.
                await bundle.assignProductCollection(selected.getId());
                await removeSelectionExperience();
                setCollection(selected);
                setProduct(undefined);
                setWorkflow(undefined);
                setReachedIndex(pageIndex("product"));
                setPage("product");
            }, "We couldn't select that collection. Please try again."),
        [attempt, bundle, collection, confirmReplace, removeSelectionExperience],
    );

    const handleProductSelected = useCallback(
        (selected: CollectionProduct) =>
            attempt(async () => {
                const workflows = selected.getAllWorkflows();
                if (workflows.length === 0) {
                    throw new Error("The selected product has no designs available.");
                }

                if (product?.getId() === selected.getId()) {
                    if (workflows.length > 1) {
                        setReachedIndex((reached) => Math.max(reached, pageIndex("workflow")));
                        setPage("workflow");
                    } else if (selectionExperience) {
                        setExperience(selectionExperience);
                        setPage("experience");
                    } else {
                        await startExperience(selected, workflows[0]);
                    }
                    return;
                }

                if (!(await confirmReplace("product"))) return;

                if (workflows.length === 1) {
                    await startExperience(selected, workflows[0]);
                    return;
                }

                await removeSelectionExperience();
                setProduct(selected);
                setWorkflow(undefined);
                setReachedIndex(pageIndex("workflow"));
                setPage("workflow");
            }, "We couldn't set up that product. Please try again."),
        [attempt, confirmReplace, product, removeSelectionExperience, selectionExperience, startExperience],
    );

    const handleWorkflowSelected = useCallback(
        (selected: ProductWorkflow) =>
            attempt(async () => {
                if (!product) return;

                if (selectionExperience && workflow?.getId() === selected.getId()) {
                    setExperience(selectionExperience);
                    setPage("experience");
                    return;
                }

                if (!(await confirmReplace("workflow"))) return;

                await startExperience(product, selected);
            }, "We couldn't start that design. Please try again."),
        [attempt, confirmReplace, product, selectionExperience, startExperience, workflow],
    );

    const refreshOwner = useCallback(async () => {
        const stakeholders = await bundle.getAllStakeholders();
        setOwner(stakeholders.find((stakeholder) => stakeholder.type === StakeholderType.Owner)?.customer);
    }, [bundle]);

    useEffect(() => {
        refreshOwner().catch((error) => console.error("Error checking the customer's details:", error));
    }, [refreshOwner]);

    // Records the customer's details against the bundle: as its owner, in its metadata and as its organization.
    const saveDetails = useCallback(
        async (details: QuoteDetails) => {
            // Details are stored under the configured identifier for each field, falling back to its type.
            const items = conversionConfiguration?.requestedDataItems ?? [];
            const valueOf = (type: ConversionDataType) => {
                const item = items.find((candidate) => candidate.type === type);
                return details[item?.uniqueIdentifier ?? type]?.trim() || undefined;
            };

            const email = valueOf(ConversionDataType.Email);
            if (email) {
                // Stakeholders that aren't in the list are removed, so the other stakeholders are kept as they are
                // and only the owner is replaced. This also covers the owner changing their email.
                const stakeholders = await bundle.getAllStakeholders();
                const others = stakeholders.flatMap((stakeholder) =>
                    stakeholder.type && stakeholder.type !== StakeholderType.Owner && stakeholder.customer?.emailAddress
                        ? [
                              {
                                  type: stakeholder.type,
                                  customerDetails: {
                                      emailAddress: stakeholder.customer.emailAddress,
                                      firstName: stakeholder.customer.firstName,
                                      lastName: stakeholder.customer.lastName,
                                      phoneNumber: stakeholder.customer.phoneNumber,
                                  },
                              },
                          ]
                        : [],
                );
                await bundle.updateStakeholders([
                    ...others,
                    {
                        type: StakeholderType.Owner,
                        customerDetails: {
                            emailAddress: email,
                            firstName: valueOf(ConversionDataType.FirstName),
                            lastName: valueOf(ConversionDataType.LastName),
                            phoneNumber: valueOf(ConversionDataType.Phone),
                        },
                    },
                ]);
            }

            const metadata = new Map(bundle.getMetadata());
            for (const [key, value] of Object.entries(details)) {
                if (value.trim()) metadata.set(key, value.trim());
            }
            if (conversionConfiguration) metadata.set("conversionConfigurationId", conversionConfiguration.id);
            await bundle.setMetadata(metadata);

            const organizationName = valueOf(ConversionDataType.OrganizationName);
            if (organizationName) await bundle.attachOrganization(organizationName);
            await refreshOwner();
        },
        [bundle, conversionConfiguration, refreshOwner],
    );

    // Asks for the customer's details if the conversion configuration calls for it at this location. Each location is
    // only asked once, and never when the bundle already has an owner. Resolves once the prompt has closed.
    const requestConversionIfRequired = useCallback(
        async (location: ConversionLocation) => {
            if (!conversionConfiguration?.locations?.includes(location)) return;
            if (consumedConversionLocations.current.has(location)) return;
            const stakeholders = await bundle.getAllStakeholders();
            if (stakeholders.some((stakeholder) => stakeholder.type === StakeholderType.Owner)) return;
            consumedConversionLocations.current.add(location);
            await new Promise<void>((resolve) => setPendingConversion({ resolve: () => resolve() }));
        },
        [bundle, conversionConfiguration],
    );

    // The customer can offer or update their details at any time when the configuration allows it.
    const manualConversionAvailable = !!conversionConfiguration?.locations?.includes(ConversionLocation.Manual);

    // What the customer has already entered, so it can be shown and changed. Details are stored under the
    // configured identifier for each field, falling back to its type.
    const existingDetails = useCallback((): QuoteDetails => {
        const metadata = bundle.getMetadata();
        const fromOwner: Partial<Record<ConversionDataType, string | undefined>> = {
            [ConversionDataType.Email]: owner?.emailAddress,
            [ConversionDataType.FirstName]: owner?.firstName,
            [ConversionDataType.LastName]: owner?.lastName,
            [ConversionDataType.Phone]: owner?.phoneNumber,
        };
        const values: QuoteDetails = {};
        for (const item of conversionConfiguration?.requestedDataItems ?? []) {
            const id = fieldId(item);
            const value = metadata.get(id) ?? fromOwner[item.type];
            if (value) values[id] = value;
        }
        return values;
    }, [bundle, conversionConfiguration, owner]);

    const closeConversion = (completed = true) => {
        pendingConversion?.resolve(completed);
        setPendingConversion(undefined);
    };

    // Reaching the personalise page for the first time is the start of the customer's design.
    const onExperiencePage = page === "experience" && !!experience;
    useEffect(() => {
        if (onExperiencePage) void requestConversionIfRequired(ConversionLocation.OnStart);
    }, [onExperiencePage, requestConversionIfRequired]);

    const handleFinish = useCallback(async () => {
        try {
            await requestConversionIfRequired(ConversionLocation.OnEnd);
            // A screenshot can only be taken from the live preview when there is a single experience.
            const takeScreenshot =
                bundle.getWorkflowExperienceCount() === 1
                    ? (wfe: WorkflowExperience, use3D?: boolean) => wfe.createPreviewImage(use3D, 1024)
                    : undefined;
            const result = await bundle.finish(undefined, takeScreenshot);
            const spiffThemeLoader = (window as any).SpiffThemeLoader as SpiffThemeLoader;
            if (bundle.getTest()) {
                // Test orders are placed directly and the window is closed rather than handing off to the cart.
                await bundle.placeOrder();
                spiffThemeLoader.close();
            } else {
                spiffThemeLoader.addToEcommerceCart(result);
            }
        } catch (error) {
            console.error("Error completing the design:", error);
            // The finish step shows this message under its button.
            throw new Error("We couldn't add your design to the cart. Please try again.");
        }
    }, [bundle, requestConversionIfRequired]);

    // Confirming a quote asks for the customer's details in the dialog, starting from those already on the bundle.
    // This resolves with whether the quote was requested, which is false when the customer cancels.
    const handleRequestQuote = useCallback(
        () =>
            new Promise<boolean>((resolve) =>
                setPendingConversion({ resolve, quote: true, initialValues: existingDetails() }),
            ),
        [existingDetails],
    );

    const confirmQuote = useCallback(
        async (details: QuoteDetails) => {
            try {
                await saveDetails(details);
                const quoteId = await bundle.generateQuoteId();
                await bundle.finish();
                const spiffThemeLoader = (window as any).SpiffThemeLoader as SpiffThemeLoader;
                spiffThemeLoader.completeQuote({ bundleId: bundle.getId(), quoteId });
            } catch (error) {
                console.error("Error requesting a quote:", error);
                // The finish step shows this message under its button.
                throw new Error("We couldn't request your quote. Please try again.");
            }
        },
        [bundle, saveDetails],
    );

    const saveConversionDetails = useCallback(
        async (details: QuoteDetails) => {
            try {
                await saveDetails(details);
            } catch (error) {
                console.error("Error saving the customer's details:", error);
                throw new Error("We couldn't save your details. Please try again.");
            }
        },
        [saveDetails],
    );

    // A page can be returned to once it has been reached, as long as what it needs still exists.
    const canVisit = (index: number) =>
        index <= reachedIndex &&
        PAGE_STEPS[index].page !== page &&
        (index === 0 || (index === 1 && !!collection) || (index === 2 && !!product) || (index === 3 && !!experience));

    return (
        <div
            style={{
                height: "100%",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                position: "relative",
            }}
        >
            <PageStepper
                steps={PAGE_STEPS.map((pageStep) => pageStep.label)}
                currentIndex={pageIndex(page)}
                enabledSteps={PAGE_STEPS.map((_, index) => canVisit(index))}
                onStepSelected={(index) => {
                    setErrorMessage(undefined);
                    setPage(PAGE_STEPS[index].page);
                }}
                actions={
                    manualConversionAvailable ? (
                        <DetailsButton
                            disabled={!!pendingConversion}
                            onClick={() =>
                                void new Promise<void>((resolve) =>
                                    setPendingConversion({
                                        resolve: () => resolve(),
                                        manual: true,
                                        initialValues: existingDetails(),
                                    }),
                                )
                            }
                        >
                            Your details
                            <UserRound size={16} aria-hidden="true" />
                        </DetailsButton>
                    ) : undefined
                }
            />
            {bundle.getTest() && <TestOrderBanner />}
            {errorMessage && <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(undefined)} />}
            <div style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden", position: "relative" }}>
                {page === "collection" && (
                    <ProductCollectionSelector
                        selectedCollectionId={collection?.getId()}
                        onCollectionSelected={handleCollectionSelected}
                    />
                )}
                {page === "product" && collection && (
                    <ProductSelector
                        collection={collection}
                        selectedProductId={product?.getId()}
                        onProductSelected={handleProductSelected}
                    />
                )}
                {page === "workflow" && product && (
                    <WorkflowSelector
                        product={product}
                        selectedWorkflowId={workflow?.getId()}
                        onWorkflowSelected={handleWorkflowSelected}
                    />
                )}
                {page === "experience" && experience && (
                    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        {bundle.getWorkflowExperienceCount() > 1 && (
                            <ExperienceSwitcher
                                experiences={bundle.getWorkflowExperiences()}
                                active={experience}
                                onSelect={setExperience}
                            />
                        )}
                        <div style={{ flex: "1 1 0", minHeight: 0 }}>
                            <Customization
                                key={experience.getTransaction().id}
                                workflowExperience={experience}
                                onNext={handleFinish}
                                onRequestQuote={handleRequestQuote}
                            />
                        </div>
                    </div>
                )}
            </div>
            {pendingConversion && (
                <ConversionDialog
                    // A quote can be cancelled, but it can't go ahead without the customer's details.
                    mandatory={
                        !pendingConversion.quote && !pendingConversion.manual && !!conversionConfiguration?.mandatory
                    }
                    initialValues={pendingConversion.initialValues}
                    submitLabel={
                        pendingConversion.quote ? "Confirm your quote" : pendingConversion.manual ? "Save" : undefined
                    }
                    submittingLabel={pendingConversion.quote ? "Requesting quote..." : undefined}
                    onSubmit={async (details) => {
                        await (pendingConversion.quote ? confirmQuote(details) : saveConversionDetails(details));
                        closeConversion();
                    }}
                    onSkip={() => closeConversion(false)}
                    skipLabel={pendingConversion.quote ? "Cancel" : undefined}
                />
            )}
            {pendingReplace && (
                <ConfirmReplaceDialog
                    subject={pendingReplace.subject}
                    onConfirm={(dontAskAgain) => resolveReplace(true, dontAskAgain)}
                    onCancel={() => resolveReplace(false)}
                />
            )}
        </div>
    );
};

export default PageHandler;
