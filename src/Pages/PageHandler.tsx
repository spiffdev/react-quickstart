import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { UserRound } from "lucide-react";
import useBundle from "../hooks/useBundle";
import ProductCollectionSelector from "./ProductCollectionSelector";
import {
    CollectionProduct,
    ExportedStepData,
    ProductCollection,
    ProductWorkflow,
    WorkflowExperience,
} from "@spiffcommerce/core";
import ProductSelector from "./ProductSelector";
import useClient from "../hooks/useClient";
import WorkflowSelector from "./WorkflowSelector";
import Customization from "./Customization";
import ReviewPage from "./Review";
import ThankYouPage from "./ThankYou";
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

type PageType = "collection" | "product" | "workflow" | "experience" | "review" | "thankyou";

type PageStep = { page: PageType; label: string };

// The pages that are always present, in the order the customer visits them, and the heading each is shown under.
// The optional review and thank you pages follow these, so these indexes never change.
const PAGE_STEPS: PageStep[] = [
    { page: "collection", label: "Collection" },
    { page: "product", label: "Product" },
    { page: "workflow", label: "Design" },
    { page: "experience", label: "Personalise" },
];

const pageIndex = (page: PageType) => PAGE_STEPS.findIndex((step) => step.page === page);

const REVIEW_STEP: PageStep = { page: "review", label: "Review" };
const THANK_YOU_STEP: PageStep = { page: "thankyou", label: "Thank you" };

const PageHandler: FunctionComponent<{}> = () => {
    const client = useClient();
    const bundle = useBundle();
    const {
        conversionConfiguration,
        reviewPageEnabled,
        thankYouPageEnabled,
        thankYouMessage,
        thankYouCloseLabel,
        addToCartLabel,
    } = useThemeConfiguration();
    // The thank you page doesn't depend on the review page, so each is added independently.
    const steps = useMemo(
        () => [
            ...PAGE_STEPS,
            ...(reviewPageEnabled ? [REVIEW_STEP] : []),
            ...(thankYouPageEnabled ? [THANK_YOU_STEP] : []),
        ],
        [reviewPageEnabled, thankYouPageEnabled],
    );
    const stepIndex = useCallback((target: PageType) => steps.findIndex((step) => step.page === target), [steps]);
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
    // The details of the design on the personalise page, for the review page. Tagged with the experience they're for.
    const [summary, setSummary] = useState<
        { experienceId: string; exportedData: ExportedStepData[]; selectionCost: number } | undefined
    >(undefined);
    // Set once the design has been handed off, after which the earlier pages can't be returned to.
    const [completion, setCompletion] = useState<{ kind: "design" } | { kind: "quote"; quoteId: string } | undefined>(
        undefined,
    );
    // The thank you page's preparation of the hand-off.
    const preparation = useRef<Promise<() => void> | undefined>(undefined);
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
        setSummary(undefined);
        setCompletion(undefined);
        preparation.current = undefined;

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

    // A preview image is only needed for the first experience, and is rendered to an offscreen canvas (never 3D) so
    // it doesn't depend on a live preview being on screen.
    const takeScreenshot = useCallback(
        async (wfe: WorkflowExperience) => {
            if (wfe.getTransaction().id !== bundle.getWorkflowExperiences()[0]?.getTransaction().id) return undefined;
            try {
                return await wfe.createPreviewImage(false, 1024);
            } catch (error) {
                console.error("Error creating the preview image:", error);
                return undefined;
            }
        },
        [bundle],
    );

    // Finishes the bundle. Resolves with what to do to hand it off, which is left to the caller so the thank you
    // page can wait for the customer to leave.
    const finishBundle = useCallback(async () => {
        const result = await bundle.finish(undefined, takeScreenshot);
        const spiffThemeLoader = (window as any).SpiffThemeLoader as SpiffThemeLoader;
        if (bundle.getTest()) {
            // Test orders are placed directly and the window is closed rather than handing off to the cart.
            await bundle.placeOrder();
            return () => spiffThemeLoader.close();
        }
        return () => spiffThemeLoader.addToEcommerceCart(result);
    }, [bundle, takeScreenshot]);

    // Completes the design. With a thank you page that page prepares the hand-off and the customer's exit performs
    // it, otherwise it all happens now. Throws a customer-readable message on failure.
    const completeDesign = useCallback(async () => {
        try {
            await requestConversionIfRequired(ConversionLocation.OnEnd);
            if (thankYouPageEnabled) {
                preparation.current = undefined;
                setCompletion({ kind: "design" });
                setPage("thankyou");
                return;
            }
            (await finishBundle())();
        } catch (error) {
            console.error("Error completing the design:", error);
            // The finish step shows this message under its button.
            throw new Error("We couldn't add your design to the cart. Please try again.");
        }
    }, [finishBundle, requestConversionIfRequired, thankYouPageEnabled]);

    // Prepares the hand-off for the thank you page. Only ever runs once per visit, however often it's asked for.
    const prepareHandOff = useCallback((): Promise<() => void> => {
        if (!preparation.current) {
            const quote = completion?.kind === "quote";
            // A quote isn't handed off yet, so leaving simply closes the experience.
            const prepared = quote
                ? Promise.resolve(() => ((window as any).SpiffThemeLoader as SpiffThemeLoader).close())
                : finishBundle();
            preparation.current = prepared;
            // A failure can be tried again.
            prepared.catch((error) => {
                console.error("Error preparing the design:", error);
                if (preparation.current === prepared) preparation.current = undefined;
            });
        }
        return preparation.current;
    }, [completion, finishBundle]);

    // Finishing the personalise page leads to the review page when there is one, and otherwise completes the design.
    const handleFinish = useCallback(async () => {
        if (reviewPageEnabled) {
            setReachedIndex((reached) => Math.max(reached, stepIndex("review")));
            setPage("review");
            return;
        }
        await completeDesign();
    }, [reviewPageEnabled, completeDesign, stepIndex]);

    const handleSummaryChanged = useCallback(
        (changed: { exportedData: ExportedStepData[]; selectionCost: number }) =>
            experience && setSummary({ experienceId: experience.getTransaction().id, ...changed }),
        [experience],
    );

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
                if (thankYouPageEnabled) {
                    // The thank you page takes over from here. Quotes aren't handed off yet.
                    preparation.current = undefined;
                    setCompletion({ kind: "quote", quoteId });
                    setPage("thankyou");
                    return;
                }
                await bundle.finish();
                const spiffThemeLoader = (window as any).SpiffThemeLoader as SpiffThemeLoader;
                spiffThemeLoader.completeQuote({ bundleId: bundle.getId(), quoteId });
            } catch (error) {
                console.error("Error requesting a quote:", error);
                // The finish step shows this message under its button.
                throw new Error("We couldn't request your quote. Please try again.");
            }
        },
        [bundle, saveDetails, thankYouPageEnabled],
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
    const canVisit = (index: number) => {
        const target = steps[index].page;
        if (completion || index > reachedIndex || target === page) return false;
        switch (target) {
            case "collection":
                return true;
            case "product":
                return !!collection;
            case "workflow":
                return !!product;
            case "experience":
            case "review":
                return !!experience;
            default:
                return false;
        }
    };

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
                steps={steps.map((pageStep) => pageStep.label)}
                currentIndex={stepIndex(page)}
                enabledSteps={steps.map((_, index) => canVisit(index))}
                onStepSelected={(index) => {
                    setErrorMessage(undefined);
                    setPage(steps[index].page);
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
                                onSummaryChanged={handleSummaryChanged}
                            />
                        </div>
                    </div>
                )}
                {page === "review" && experience && (
                    <ReviewPage
                        workflowExperience={experience}
                        exportedData={
                            summary?.experienceId === experience.getTransaction().id ? summary.exportedData : undefined
                        }
                        selectionCost={
                            summary?.experienceId === experience.getTransaction().id ? summary.selectionCost : 0
                        }
                        onConfirm={completeDesign}
                        confirmLabel={addToCartLabel}
                    />
                )}
                {page === "thankyou" && completion && (
                    <ThankYouPage
                        message={thankYouMessage}
                        closeLabel={thankYouCloseLabel}
                        quoteId={completion.kind === "quote" ? completion.quoteId : undefined}
                        onPrepare={prepareHandOff}
                    />
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
