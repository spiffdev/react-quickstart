import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { CircleUserRound, ClipboardList, LogOut, UserRound } from "lucide-react";
import useBundle from "../hooks/useBundle";
import ProductCollectionSelector from "./ProductCollectionSelector";
import {
    CollectionProduct,
    getProductCollections,
    ProductCollection,
    ProductWorkflow,
    WorkflowExperience,
} from "@spiffcommerce/core";
import ProductSelector from "./ProductSelector";
import useClient from "../hooks/useClient";
import useActivation from "../hooks/useActivation";
import LoadingOverlay from "./components/LoadingOverlay";
import SingleProductSelector from "./ProductSelector/SingleProductSelector";
import WorkflowSelector from "./WorkflowSelector";
import Customization from "./Customization";
import { createDesignPreviewImage, withScreenshotPreview } from "./Customization/previewScreenshot";
import ReviewPage from "./Review";
import SharedPersonalization from "./SharedPersonalization";
import ThankYouPage from "./ThankYou";
import ErrorBanner from "../components/ErrorBanner";
import ExperienceSwitcher from "./components/ExperienceSwitcher";
import PageStepper from "./components/PageStepper";
import { ConversionDataType, ConversionLocation, type SpiffThemeLoader } from "@spiffcommerce/theme-bridge";
import { StakeholderType, type Customer } from "@spiffcommerce/core";
import TestOrderBanner from "../components/TestOrderBanner";
import ConfirmReplaceDialog, { type ReplaceSubject } from "../components/ConfirmReplaceDialog";
import useThemeConfiguration, {
    useCheckoutOptions,
    useGroupPageKeys,
    usePageEnabled,
} from "../hooks/useThemeConfiguration";
import type { QuoteDetails } from "./Customization/components/QuoteForm";
import { fieldId, missingConversionFields, prefillConversionDetails } from "../utils/conversionDetails";
import ConversionDialog from "../components/ConversionDialog";
import AccountDialog from "../components/AccountDialog";
import GuestEmailDialog from "../components/GuestEmailDialog";
import SaveAndExitDialog from "../components/SaveAndExitDialog";
import OrderDetailsDialog from "../components/OrderDetailsDialog";
import WelcomePage from "./Welcome";
import useInactivityTimeout from "../hooks/useInactivityTimeout";
import type { AccountPage } from "../components/AccountDialog";
import { useStartNewBundle } from "../hooks/useBundle";
import useOrderDetailFields from "../hooks/useOrderDetails";
import { missingOrderDetails, readOrderDetails } from "../utils/orderDetails";
import useAccount from "../hooks/useAccount";

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

type PageType = "welcome" | "collection" | "product" | "workflow" | "experience" | "shared" | "review" | "thankyou";

/** What the thank you page waits for before the customer can leave. */
export type PreparedHandOff = {
    /** Hands the design off, which ends the experience. */
    leave: () => void;
    /**
     * Whatever of the hand-off is still to do when the customer starts a new order instead of leaving, which doesn't
     * end the experience. Nothing when the design has already been placed (test orders) or is only a quote.
     */
    complete?: () => void;
    /** The number of the order that was placed, if the theme placed one. */
    orderNumber?: string;
};

type PageStep = { page: PageType; label: string };

// Every page in the order the customer visits them, and the heading each is shown under. The collection page is left
// out when there's only one collection, and the review and thank you pages when they're switched off.
const COLLECTION_STEP: PageStep = { page: "collection", label: "Collection" };
const PRODUCT_STEP: PageStep = { page: "product", label: "Products" };
// Only in single product mode, where a product with several workflows asks which one to start.
const WORKFLOW_STEP: PageStep = { page: "workflow", label: "Design" };
const EXPERIENCE_STEP: PageStep = { page: "experience", label: "Personalise" };
// The options shared by every product, which come from the activation's Global Property Configuration.
const SHARED_STEP: PageStep = { page: "shared", label: "Shared" };
const REVIEW_STEP: PageStep = { page: "review", label: "Review" };
const THANK_YOU_STEP: PageStep = { page: "thankyou", label: "Thank you" };

// How far through the journey a page is, which stays the same whichever pages are left out. The two personalise pages
// can be in either order.
const pageRankIn = (page: PageType, sharedFirst: boolean) =>
    (sharedFirst
        ? ["collection", "product", "workflow", "shared", "experience", "review", "thankyou"]
        : ["collection", "product", "workflow", "experience", "shared", "review", "thankyou"]
    ).indexOf(page);

// A page which isn't in the partner's order comes last.
const orderIndex = (keys: string[], key: string) => (keys.includes(key) ? keys.indexOf(key) : Infinity);

// The recipient's details, in the order `updateRecipient` takes them (from first name to the fifth custom field), when
// only its conversion configuration is being set.
const NO_RECIPIENT_CHANGES = Array.from({ length: 16 }, () => undefined) as unknown as [
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
];

const PageHandler: FunctionComponent<{
    /** The product to personalise when it has already been chosen (single product mode only). */
    collectionProduct?: CollectionProduct;
}> = ({ collectionProduct }) => {
    const client = useClient();
    const bundle = useBundle();
    const activation = useActivation();
    const {
        conversionConfiguration: themeConversionConfiguration,
        thankYouMessage,
        thankYouCloseLabel,
        addToCartLabel,
        portalPromptEmail,
        portalEnforceLogin,
        portalInactivitySeconds,
        portalSaveAndExit,
        thankYouShowStartOver,
        thankYouStartOverLabel,
    } = useThemeConfiguration();
    const { enabled: portalEnabled, customer, resetSession } = useAccount();
    const startNewBundle = useStartNewBundle();
    const welcomeEnabled = usePageEnabled("welcome");
    const conversionConfiguration = themeConversionConfiguration;
    // With the user portal, the conversion configuration's details are asked for on the review page, or in a popup just
    // before the design is finalised when there's no review page, instead of at the places the configuration lists.
    const portalConversion = portalEnabled && (conversionConfiguration?.requestedDataItems?.length ?? 0) > 0;
    const [accountOpen, setAccountOpen] = useState(false);
    // What the customer has typed into the details on the review page. Until they've typed, it's what's already known.
    const [editedConversion, setEditedConversion] = useState<QuoteDetails | undefined>(undefined);
    // The page of the account dialog to open on, which depends on where it was opened from.
    const [accountPage, setAccountPage] = useState<AccountPage>("menu");
    const openAccount = useCallback((initialPage: AccountPage = "menu") => {
        setAccountPage(initialPage);
        setAccountOpen(true);
    }, []);
    // The order details dialog, and what is waiting on it.
    const orderDetailFields = useOrderDetailFields();
    const [pendingOrderDetails, setPendingOrderDetails] = useState<{ resolve: (saved: boolean) => void } | undefined>(
        undefined,
    );
    // Applying a saved branding template changes the shared options, so the shared page is shown afresh.
    const [templateRevision, setTemplateRevision] = useState(0);
    // Whether the guest email prompt is showing, and the bundles it has already been shown for.
    const [guestPromptOpen, setGuestPromptOpen] = useState(false);
    const guestPromptedBundles = useRef(new WeakSet<object>());
    // Settles whatever is waiting on the prompt.
    const guestPromptResolve = useRef<(() => void) | undefined>(undefined);
    const closeGuestPrompt = useCallback(() => {
        guestPromptResolve.current?.();
        guestPromptResolve.current = undefined;
        setGuestPromptOpen(false);
    }, []);
    const [saveAndExitOpen, setSaveAndExitOpen] = useState(false);
    const { allowCart, allowQuote } = useCheckoutOptions();
    const reviewPageEnabled = usePageEnabled("review");
    const thankYouPageEnabled = usePageEnabled("thank-you");
    // The shared page only exists when the partner has switched it on and there are shared properties to show.
    const sharedPageEnabled = usePageEnabled("shared-personalize");
    const personalizeOrder = useGroupPageKeys("personalization");
    // Only the activation's own configuration counts, not one inherited from a product collection.
    const sharedPageShown = sharedPageEnabled && !!activation.globalPropertyConfiguration;
    const sharedFirst =
        sharedPageShown &&
        orderIndex(personalizeOrder, "shared-personalize") < orderIndex(personalizeOrder, "personalize");
    const pageRank = useCallback((page: PageType) => pageRankIn(page, sharedFirst), [sharedFirst]);
    // The page where the customer starts personalising.
    const firstPersonalizePage: PageType = sharedFirst ? "shared" : "experience";
    // Read by the effect which starts a bundle off, which mustn't run again just because these change.
    const startingPoint = useRef({ firstPersonalizePage, pageRank, welcomeEnabled });
    startingPoint.current = { firstPersonalizePage, pageRank, welcomeEnabled };
    // In single product mode the customer works on one design at a time: they choose a product (and a workflow, if it
    // has several) and that replaces the previous choice. Otherwise they build a cart of any number of designs.
    const singleMode = !!activation.singleProductMode;
    // A product which has already been chosen skips the product page, and the design page too if it has one workflow.
    const presetProduct = singleMode ? collectionProduct : undefined;
    const presetWorkflows = useMemo(() => presetProduct?.getAllWorkflows() ?? [], [presetProduct]);
    // If starting the preset product's only design fails, the design page is shown so the customer can try again.
    const [presetStartFailed, setPresetStartFailed] = useState(false);
    // With a single collection there's nothing to choose, so it's selected for the customer. If that fails the customer
    // is shown the collection page instead, so they can try again.
    const [autoSelectFailed, setAutoSelectFailed] = useState(false);
    const onlyCollectionId =
        activation.activationProductCollections?.length === 1
            ? activation.activationProductCollections[0].productCollection.id
            : undefined;
    const autoSelectCollection = !!onlyCollectionId && !autoSelectFailed;
    // The thank you page doesn't depend on the review page, so each is added independently.
    const steps = useMemo(
        () => [
            ...(autoSelectCollection || presetProduct ? [] : [COLLECTION_STEP]),
            ...(presetProduct ? [] : [PRODUCT_STEP]),
            ...(singleMode && !(presetProduct && presetWorkflows.length === 1) ? [WORKFLOW_STEP] : []),
            ...(sharedFirst ? [SHARED_STEP] : []),
            EXPERIENCE_STEP,
            ...(sharedPageShown && !sharedFirst ? [SHARED_STEP] : []),
            ...(reviewPageEnabled ? [REVIEW_STEP] : []),
            ...(thankYouPageEnabled ? [THANK_YOU_STEP] : []),
        ],
        [
            autoSelectCollection,
            presetProduct,
            presetWorkflows.length,
            singleMode,
            sharedFirst,
            sharedPageShown,
            reviewPageEnabled,
            thankYouPageEnabled,
        ],
    );
    const stepIndex = useCallback((target: PageType) => steps.findIndex((step) => step.page === target), [steps]);
    const [page, setPage] = useState<PageType>("collection");
    const [collection, setCollection] = useState<ProductCollection | undefined>(undefined);
    // Single product mode: the product and workflow chosen, and the experience they created.
    const [product, setProduct] = useState<CollectionProduct | undefined>(undefined);
    const [workflow, setWorkflow] = useState<ProductWorkflow | undefined>(undefined);
    const [selectionExperience, setSelectionExperience] = useState<WorkflowExperience | undefined>(undefined);
    // Experiences made by the selection pages in this visit. Only these are ever discarded by a new selection, so a
    // reloaded bundle's existing designs are never thrown away.
    const createdExperiences = useRef(new Set<WorkflowExperience>());
    // The experience shown on the personalise page.
    const [experience, setExperience] = useState<WorkflowExperience | undefined>(undefined);
    // Product steps add and remove experiences from the bundle, which the experience switcher needs to reflect.
    // While a product step is updating, new experiences are held back so a product only appears once it's fully set up.
    const [bundleRevision, setBundleRevision] = useState(0);
    const holdingExperiences = useRef(false);
    const refreshExperiences = useCallback(() => {
        if (!holdingExperiences.current) setBundleRevision((current) => current + 1);
    }, []);
    const handleProductsUpdating = useCallback((updating: boolean) => {
        holdingExperiences.current = updating;
        if (!updating) setBundleRevision((current) => current + 1);
    }, []);
    useEffect(() => {
        bundle.addEventListener("workflow-experience-added", refreshExperiences);
        bundle.addEventListener("workflow-experience-removed", refreshExperiences);
        return () => {
            bundle.removeEventListener("workflow-experience-added", refreshExperiences);
            bundle.removeEventListener("workflow-experience-removed", refreshExperiences);
        };
    }, [bundle, refreshExperiences]);
    // The furthest page the customer can return to using the stepper, as a rank from `pageRank`.
    const [reachedRank, setReachedRank] = useState(0);
    // Set once the design has been handed off, after which the earlier pages can't be returned to.
    const [completion, setCompletion] = useState<{ kind: "design" } | { kind: "quote"; quoteId: string } | undefined>(
        undefined,
    );
    // The thank you page's preparation of the hand-off.
    const preparation = useRef<Promise<PreparedHandOff> | undefined>(undefined);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
    // "Don't ask again" is deliberately held in memory only, so it lasts until the page is reloaded.
    const skipReplaceConfirmation = useRef(false);
    // The conversion prompt currently shown, and the locations it has already been shown at.
    const [pendingConversion, setPendingConversion] = useState<
        | {
              resolve: (completed: boolean) => void;
              manual?: boolean;
              quote?: boolean;
              /** Only gets the details, which are saved, whether it's for a quote or not. */
              collect?: boolean;
              initialValues?: QuoteDetails;
          }
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
        setProduct(presetProduct);
        setWorkflow(undefined);
        setSelectionExperience(undefined);
        setPresetStartFailed(false);
        setCompletion(undefined);
        preparation.current = undefined;
        // Anything which was open belonged to the previous bundle.
        setAccountOpen(false);
        setEditedConversion(undefined);

        // A reloaded bundle already has products, so pick up where the customer left off.
        const experiences = bundle.getWorkflowExperiences();
        if (experiences.length > 0) {
            setExperience(experiences[0]);
            setPage(startingPoint.current.firstPersonalizePage);
            setReachedRank(startingPoint.current.pageRank(startingPoint.current.firstPersonalizePage));
        } else if (startingPoint.current.welcomeEnabled) {
            // Where the customer goes from there is worked out when they leave, as it can change meanwhile.
            setExperience(undefined);
            setPage("welcome");
            setReachedRank(0);
        } else {
            setExperience(undefined);
            if (presetProduct) {
                // There is no product to choose, only (perhaps) which of its designs to start.
                setPage("workflow");
                setReachedRank(startingPoint.current.pageRank("workflow"));
            } else {
                setPage(bundleCollection ? "product" : "collection");
                setReachedRank(
                    bundleCollection
                        ? startingPoint.current.pageRank("product")
                        : startingPoint.current.pageRank("collection"),
                );
            }
        }
    }, [bundle, presetProduct]);

    // Selects the only collection on the customer's behalf.
    useEffect(() => {
        if (!autoSelectCollection || !onlyCollectionId || bundle.getProductCollection()) return;
        let canceled = false;
        (async () => {
            try {
                const [only] = (await getProductCollections([onlyCollectionId])) ?? [];
                if (!only) throw new Error("The collection could not be found.");
                // Assigning is safe to repeat, so a second attempt (e.g. a re-run of this effect) does no harm.
                await bundle.assignProductCollection(only.getId());
                if (canceled) return;
                setCollection(only);
                setPage((current) => (current === "collection" ? "product" : current));
                setReachedRank((reached) => Math.max(reached, pageRank("product")));
            } catch (error) {
                console.error("Error selecting the collection:", error);
                if (canceled) return;
                setAutoSelectFailed(true);
                setErrorMessage("We couldn't load the products. Please select a collection to try again.");
            }
        })();
        return () => {
            canceled = true;
        };
    }, [autoSelectCollection, bundle, onlyCollectionId, pageRank]);

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

    // A new selection replaces whatever the previous one led to (single product mode). Nothing is cleared unless the
    // removal succeeds.
    const removeSelectionExperience = useCallback(async () => {
        if (!selectionExperience) return;
        if (createdExperiences.current.has(selectionExperience)) {
            await bundle.removeWorkflowExperience(selectionExperience);
            createdExperiences.current.delete(selectionExperience);
        }
        setExperience((current) => (current === selectionExperience ? undefined : current));
        setSelectionExperience(undefined);
    }, [bundle, selectionExperience]);

    // Asks the customer to confirm before their current design (or in multi product mode, their cart) is discarded.
    // Resolves true when there is nothing to discard, or they have chosen not to be asked again.
    const confirmReplace = useCallback(
        (subject: ReplaceSubject) => {
            const hasSomethingToDiscard = singleMode
                ? !!selectionExperience
                : bundle.getWorkflowExperiences().length > 0;
            if (!hasSomethingToDiscard || skipReplaceConfirmation.current) return Promise.resolve(true);
            return new Promise<boolean>((resolve) => setPendingReplace({ subject, resolve }));
        },
        [bundle, selectionExperience, singleMode],
    );

    const resolveReplace = (confirmed: boolean, dontAskAgain = false) => {
        if (confirmed && dontAskAgain) skipReplaceConfirmation.current = true;
        pendingReplace?.resolve(confirmed);
        setPendingReplace(undefined);
    };

    const handleCollectionSelected = useCallback(
        (selected: ProductCollection) =>
            attempt(async () => {
                if (collection?.getId() === selected.getId()) {
                    // Nothing has changed, so keep everything the customer has already chosen.
                    setReachedRank((reached) => Math.max(reached, pageRank("product")));
                    setPage("product");
                    return;
                }

                if (!(await confirmReplace(singleMode ? "collection" : "cart"))) return;

                // Assigning is safe to repeat, so if removing the old designs fails the customer can just try again.
                await bundle.assignProductCollection(selected.getId());
                if (singleMode) {
                    await removeSelectionExperience();
                    setProduct(undefined);
                    setWorkflow(undefined);
                } else {
                    const discarded = bundle.getWorkflowExperiences();
                    if (discarded.length > 0) await bundle.removeWorkflowExperiences(discarded);
                    refreshExperiences();
                    setExperience(undefined);
                }
                setCollection(selected);
                setReachedRank(pageRank("product"));
                setPage("product");
            }, "We couldn't select that collection. Please try again."),
        [
            attempt,
            bundle,
            collection,
            confirmReplace,
            pageRank,
            refreshExperiences,
            removeSelectionExperience,
            singleMode,
        ],
    );

    // Single product mode: creates the new experience before the previous one is removed, so a failure never leaves
    // the customer without one.
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
            setReachedRank(pageRank(firstPersonalizePage));
            setPage(firstPersonalizePage);
            if (leftoverWarning) {
                setErrorMessage(leftoverWarning);
            }
        },
        [bundle, client, firstPersonalizePage, pageRank, removeSelectionExperience],
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
                        setReachedRank((reached) => Math.max(reached, pageRank("workflow")));
                        setPage("workflow");
                    } else if (selectionExperience) {
                        setExperience(selectionExperience);
                        setPage(firstPersonalizePage);
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
                setReachedRank(pageRank("workflow"));
                setPage("workflow");
            }, "We couldn't set up that product. Please try again."),
        [
            attempt,
            confirmReplace,
            firstPersonalizePage,
            pageRank,
            product,
            removeSelectionExperience,
            selectionExperience,
            startExperience,
        ],
    );

    const handleWorkflowSelected = useCallback(
        (selected: ProductWorkflow) =>
            attempt(async () => {
                if (!product) return;

                if (selectionExperience && workflow?.getId() === selected.getId()) {
                    setExperience(selectionExperience);
                    setPage(firstPersonalizePage);
                    return;
                }

                if (!(await confirmReplace("workflow"))) return;

                await startExperience(product, selected);
            }, "We couldn't start that design. Please try again."),
        [attempt, confirmReplace, firstPersonalizePage, product, selectionExperience, startExperience, workflow],
    );

    // Adds a design of the product to the cart. The customer stays on the product page to add more.
    const handleProductAdded = useCallback(
        (selected: CollectionProduct, selectedWorkflow: ProductWorkflow | undefined) =>
            attempt(async () => {
                if (!selectedWorkflow) {
                    throw new Error("The selected product has no designs available.");
                }
                const [created] = await client.getWorkflowExperiences([
                    {
                        type: "integration",
                        workflowId: selectedWorkflow.getId(),
                        integrationProductId: selected.getCurrentIntegration().id,
                    },
                ]);
                if (!created) {
                    throw new Error("No workflow experience was created.");
                }
                await bundle.addWorkflowExperience(created);
                refreshExperiences();
            }, "We couldn't add that product. Please try again."),
        [attempt, bundle, client, refreshExperiences],
    );

    const handleExperienceRemoved = useCallback(
        (removed: WorkflowExperience) =>
            attempt(async () => {
                await bundle.removeWorkflowExperience(removed);
                setExperience((current) => (current === removed ? undefined : current));
                refreshExperiences();
            }, "We couldn't remove that product. Please try again."),
        [attempt, bundle, refreshExperiences],
    );

    // A preset product with a single design has nothing left to choose, so its design is started straight away.
    const startingPreset =
        !!presetProduct &&
        presetWorkflows.length === 1 &&
        !presetStartFailed &&
        !selectionExperience &&
        page === "workflow" &&
        !experience;
    const presetStarted = useRef<typeof bundle | undefined>(undefined);
    useEffect(() => {
        // Once only per bundle (effects can run twice in development), unless starting it failed.
        if (!startingPreset || !presetProduct || presetStarted.current === bundle) return;
        presetStarted.current = bundle;
        let started = true;
        void attempt(async () => {
            try {
                await startExperience(presetProduct, presetWorkflows[0]);
            } catch (error) {
                started = false;
                throw error;
            }
        }, "We couldn't start your design. Please try again.").then(() => {
            if (!started) {
                presetStarted.current = undefined;
                setPresetStartFailed(true);
            }
        });
    }, [attempt, bundle, presetProduct, presetWorkflows, startExperience, startingPreset]);

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
            // The user portal asks for the details when the design is finalised instead.
            if (portalEnabled) return;
            if (!conversionConfiguration?.locations?.includes(location)) return;
            if (consumedConversionLocations.current.has(location)) return;
            const stakeholders = await bundle.getAllStakeholders();
            if (stakeholders.some((stakeholder) => stakeholder.type === StakeholderType.Owner)) return;
            consumedConversionLocations.current.add(location);
            await new Promise<void>((resolve) => setPendingConversion({ resolve: () => resolve() }));
        },
        [bundle, conversionConfiguration, portalEnabled],
    );

    // The customer can offer or update their details at any time when the configuration allows it.
    const manualConversionAvailable = !!conversionConfiguration?.locations?.includes(ConversionLocation.Manual);

    // What the customer has already entered, so it can be shown and changed. Details are stored under the
    // configured identifier for each field, falling back to its type. What isn't saved on the bundle yet is filled in
    // from the signed in customer, or failing that the bundle's owner.
    const existingDetails = useCallback(
        (): QuoteDetails =>
            prefillConversionDetails(
                conversionConfiguration?.requestedDataItems ?? [],
                bundle.getMetadata(),
                customer ?? owner,
            ),
        [bundle, conversionConfiguration, customer, owner],
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

    // Gets the details the conversion configuration asks for, and saves them, before the design is finalised (or a quote
    // is requested). With a review page they're already on it, and otherwise they're asked for in a popup. A customer
    // can leave out the details of a design unless the configuration says they're mandatory, but not those of a quote.
    // Throws a customer-readable message when the details are needed and aren't given.
    const collectConversionDetails = useCallback(
        async (quote: boolean) => {
            if (!portalConversion) return;
            const fields = conversionConfiguration?.requestedDataItems ?? [];
            const required = quote || !!conversionConfiguration?.mandatory;
            if (reviewPageEnabled && page === "review") {
                const details = editedConversion ?? existingDetails();
                if (required && missingConversionFields(fields, details).length > 0) {
                    throw new Error("Please fill in your details to continue.");
                }
                await saveConversionDetails(details);
                return;
            }
            const given = await new Promise<boolean>((resolve) =>
                setPendingConversion({ resolve, quote, collect: true, initialValues: existingDetails() }),
            );
            if (!given && required) throw new Error("Please give your details to continue.");
        },
        [
            conversionConfiguration,
            editedConversion,
            existingDetails,
            page,
            portalConversion,
            reviewPageEnabled,
            saveConversionDetails,
        ],
    );

    const closeConversion = (completed = true) => {
        pendingConversion?.resolve(completed);
        setPendingConversion(undefined);
    };

    // Reaching the personalise page for the first time is the start of the customer's design.
    // Read again when the bundle changes (not on every render), so held-back experiences stay hidden meanwhile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const switcherExperiences = useMemo(() => bundle.getWorkflowExperiences(), [bundle, bundleRevision, experience]);
    // Every transaction is given the theme's conversion configuration, as each one has a recipient from its creation.
    // The ones already done are remembered so a transaction is only updated once.
    const conversionAssigned = useRef(new Set<string>());
    useEffect(() => {
        const configurationId = conversionConfiguration?.id;
        if (!configurationId) return;
        for (const candidate of switcherExperiences) {
            const transaction = candidate.getTransaction();
            const key = `${transaction.id}:${configurationId}`;
            if (transaction.recipient?.conversionConfigurationId === configurationId) continue;
            if (conversionAssigned.current.has(key)) continue;
            conversionAssigned.current.add(key);
            // Everything else about the recipient is left as it is.
            candidate
                .getWorkflowManager()
                .updateRecipient(...NO_RECIPIENT_CHANGES, configurationId)
                .catch((error) => {
                    console.error("Error assigning the conversion configuration:", error);
                    // So a later change to the cart tries again.
                    conversionAssigned.current.delete(key);
                });
        }
    }, [conversionConfiguration?.id, switcherExperiences]);
    // Products added by a product step belong to the design they were added to, so they aren't in the cart themselves.
    const cartExperiences = useMemo(
        () => switcherExperiences.filter((candidate) => !candidate.getTransaction().parentTransaction),
        [switcherExperiences],
    );
    const handleQuantityChanged = useCallback(
        (changed: WorkflowExperience, quantity: number) =>
            attempt(async () => {
                await changed.setQuantity(quantity);
                refreshExperiences();
            }, "We couldn't change that quantity. Please try again."),
        [attempt, refreshExperiences],
    );

    // The experience to show when the customer moves on to personalise: the one they were last on, if it's still there.
    const experienceToOpen = useCallback(
        () => switcherExperiences.find((candidate) => candidate === experience) ?? cartExperiences[0],
        [cartExperiences, experience, switcherExperiences],
    );
    // The design after the one being personalised, in the order the switcher lists them. Products added to a design
    // are part of it, so when they're grouped under it they're skipped and the next design is the next one in the cart.
    const nextExperience = useMemo(() => {
        if (!experience) return undefined;
        const list = singleMode ? switcherExperiences : cartExperiences;
        const parentId = experience.getTransaction().parentTransaction?.id;
        const current =
            !singleMode && parentId
                ? (list.find((candidate) => candidate.getTransaction().id === parentId) ?? experience)
                : experience;
        const index = list.indexOf(current);
        return index >= 0 ? list[index + 1] : undefined;
    }, [cartExperiences, experience, singleMode, switcherExperiences]);
    const handleContinue = useCallback(() => {
        const toOpen = experienceToOpen();
        if (!toOpen) return;
        setExperience(toOpen);
        setReachedRank((reached) => Math.max(reached, pageRank(firstPersonalizePage)));
        setPage(firstPersonalizePage);
    }, [experienceToOpen, firstPersonalizePage, pageRank]);
    // Moves on from the welcome page to wherever a new order starts. This is decided now, rather than when the bundle
    // was loaded, as the only collection may have been selected for the customer in the meantime.
    const startFromWelcome = useCallback(() => {
        const target: PageType = presetProduct ? "workflow" : collection ? "product" : "collection";
        setReachedRank((reached) => Math.max(reached, pageRank(target)));
        setPage(target);
    }, [collection, pageRank, presetProduct]);

    // With a timeout set, a screen left alone starts over for the next customer: whoever is signed in is signed out and
    // their design is cleared. A screen with nothing to clear is only taken back to the welcome page.
    useInactivityTimeout(portalInactivitySeconds, portalEnabled && !(page === "welcome" && !customer), () => {
        if (customer || bundle.getWorkflowExperiences().length > 0) {
            resetSession().catch((error) => console.error("Error starting over after inactivity:", error));
        } else if (welcomeEnabled) {
            setPage("welcome");
            setReachedRank(0);
        }
    });

    const onExperiencePage = (page === "experience" || page === "shared") && !!experience;
    useEffect(() => {
        if (onExperiencePage) void requestConversionIfRequired(ConversionLocation.OnStart);
    }, [onExperiencePage, requestConversionIfRequired]);

    // With the user portal, a customer who hasn't signed in can be asked for their email as they start, either on
    // leaving the welcome page or on first reaching the personalise page. Each bundle is only asked once, and never when
    // it already has an owner. Resolves once the prompt has been dealt with (at once when there's nothing to ask).
    const promptForEmailIfRequired = useCallback(async () => {
        if (!portalEnabled || !portalPromptEmail || customer || guestPromptedBundles.current.has(bundle)) return;
        guestPromptedBundles.current.add(bundle);
        const stakeholders = await bundle.getAllStakeholders();
        if (stakeholders.some((stakeholder) => stakeholder.type === StakeholderType.Owner)) return;
        await new Promise<void>((resolve) => {
            guestPromptResolve.current = resolve;
            setGuestPromptOpen(true);
        });
    }, [bundle, customer, portalEnabled, portalPromptEmail]);
    useEffect(() => {
        if (onExperiencePage) {
            promptForEmailIfRequired().catch((error) => console.error("Error checking the customer's details:", error));
        }
    }, [onExperiencePage, promptForEmailIfRequired]);
    // Signing in answers the prompt, as does the bundle being swapped for another.
    useEffect(() => {
        if (customer) closeGuestPrompt();
    }, [closeGuestPrompt, customer]);
    useEffect(() => closeGuestPrompt(), [bundle, closeGuestPrompt]);
    useEffect(() => setSaveAndExitOpen(false), [bundle]);

    // Leaving the welcome page asks for the customer's email first, when that's what the partner wants.
    const currentBundle = useRef(bundle);
    currentBundle.current = bundle;
    const handleWelcomeStart = useCallback(async () => {
        const startedWith = bundle;
        try {
            await promptForEmailIfRequired();
        } catch (error) {
            console.error("Error checking the customer's details:", error);
        }
        // The bundle was replaced meanwhile (such as by signing out), so this start is no longer wanted.
        if (currentBundle.current === startedWith) startFromWelcome();
    }, [bundle, promptForEmailIfRequired, startFromWelcome]);

    // Leaves the experience once the draft is saved: closes it when it's in a frame, otherwise starts over for the next
    // customer, as there's nowhere else to go.
    const exitAfterSaving = useCallback(async () => {
        setSaveAndExitOpen(false);
        if (window.self !== window.top) {
            ((window as any).SpiffThemeLoader as SpiffThemeLoader).close();
        } else {
            await resetSession();
        }
    }, [resetSession]);

    // A preview image is only needed for the first experience. It comes from the 3D scene when the workflow is set up
    // for that, which `finishBundle` makes sure is loaded.
    const takeScreenshot = useCallback(
        async (wfe: WorkflowExperience, use3D?: boolean) => {
            if (wfe.getTransaction().id !== bundle.getWorkflowExperiences()[0]?.getTransaction().id) return undefined;
            try {
                return await createDesignPreviewImage(wfe, 1024, use3D);
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
        const first = bundle.getWorkflowExperiences()[0];
        const finish = () => bundle.finish(undefined, takeScreenshot);
        // Whether the first experience's preview is a 3D image is decided as the bundle finishes, from whether its
        // model is loaded, so it needs to be loaded for the whole of it.
        const result = await (first ? withScreenshotPreview(first, finish) : finish());
        const spiffThemeLoader = (window as any).SpiffThemeLoader as SpiffThemeLoader;
        if (bundle.getTest()) {
            // The platform allows an application to create orders itself, but this theme only does so for testing. Real
            // orders are always handed off to the e-commerce platform's cart below, which is where they're placed.
            // Test orders are placed directly and the window is closed rather than handing off to the cart.
            const order = await bundle.placeOrder();
            return { leave: () => spiffThemeLoader.close(), orderNumber: String(order.internalId) };
        }
        return {
            leave: () => spiffThemeLoader.addToEcommerceCart(result),
            complete: () => spiffThemeLoader.addToEcommerceCart(result),
        };
    }, [bundle, takeScreenshot]);

    // The design can't be completed (or a quote requested) until the order details the partner requires are filled in.
    // They're asked for if they aren't, and this throws a customer-readable message if the customer doesn't give them.
    const ensureOrderDetails = useCallback(async () => {
        if (missingOrderDetails(orderDetailFields, readOrderDetails(bundle)).length === 0) return;
        const saved = await new Promise<boolean>((resolve) => setPendingOrderDetails({ resolve }));
        if (!saved) throw new Error("Please fill in the order details to continue.");
    }, [bundle, orderDetailFields]);

    // Completes the design. With a thank you page that page prepares the hand-off and the customer's exit performs
    // it, otherwise it all happens now. Throws a customer-readable message on failure.
    const completeDesign = useCallback(async () => {
        await collectConversionDetails(false);
        await ensureOrderDetails();
        try {
            await requestConversionIfRequired(ConversionLocation.OnEnd);
            if (thankYouPageEnabled) {
                preparation.current = undefined;
                setCompletion({ kind: "design" });
                setPage("thankyou");
                return;
            }
            (await finishBundle()).leave();
        } catch (error) {
            console.error("Error completing the design:", error);
            // The finish step shows this message under its button.
            throw new Error("We couldn't add your design to the cart. Please try again.");
        }
    }, [collectConversionDetails, ensureOrderDetails, finishBundle, requestConversionIfRequired, thankYouPageEnabled]);

    // Prepares the hand-off for the thank you page. Only ever runs once per visit, however often it's asked for.
    const prepareHandOff = useCallback((): Promise<PreparedHandOff> => {
        if (!preparation.current) {
            const quote = completion?.kind === "quote";
            // A quote isn't handed off yet, so leaving simply closes the experience.
            const prepared = quote
                ? Promise.resolve<PreparedHandOff>({
                      leave: () => ((window as any).SpiffThemeLoader as SpiffThemeLoader).close(),
                  })
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

    // Moves on from a personalise page to whatever follows it: the other personalise page, then the review page when
    // there is one, and otherwise the design is completed.
    const advanceFrom = useCallback(
        async (from: "experience" | "shared") => {
            const next = steps[steps.findIndex((step) => step.page === from) + 1]?.page;
            if (next === "experience" || next === "shared" || next === "review") {
                setReachedRank((reached) => Math.max(reached, pageRank(next)));
                setPage(next);
                return;
            }
            await completeDesign();
        },
        [completeDesign, pageRank, steps],
    );
    const handleFinish = useCallback(() => advanceFrom("experience"), [advanceFrom]);
    const handleSharedFinish = useCallback(() => advanceFrom("shared"), [advanceFrom]);
    // What the customer is heading to when they leave a personalise page.
    const nextAfter = (from: "experience" | "shared") => steps[steps.findIndex((step) => step.page === from) + 1]?.page;
    // The same, when it is another page of the design rather than the end of it.
    const personalizeSuccessor = (from: "experience" | "shared") => {
        const next = nextAfter(from);
        return next === "review" || next === "shared" ? next : undefined;
    };

    const confirmQuote = useCallback(
        async (details: QuoteDetails) => {
            try {
                // With the user portal the customer is already attached to the bundle by signing in.
                if (!portalEnabled) await saveDetails(details);
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
        [bundle, portalEnabled, saveDetails, thankYouPageEnabled],
    );

    // Confirming a quote asks for the customer's details in the dialog, starting from those already on the bundle.
    // This resolves with whether the quote was requested, which is false when the customer cancels.
    // With the user portal the customer's details are those of their account, so they sign in instead.
    const handleRequestQuote = useCallback(async () => {
        if (!portalEnabled) {
            return new Promise<boolean>((resolve) =>
                setPendingConversion({ resolve, quote: true, initialValues: existingDetails() }),
            );
        }
        // Without details of their own to give, the customer's quote is theirs by signing in.
        if (!customer && !portalConversion) {
            openAccount();
            setErrorMessage("Please sign in to request a quote.");
            return false;
        }
        try {
            await collectConversionDetails(true);
            await ensureOrderDetails();
            await confirmQuote({});
            return true;
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "We couldn't request your quote.");
            return false;
        }
    }, [
        collectConversionDetails,
        confirmQuote,
        customer,
        ensureOrderDetails,
        existingDetails,
        openAccount,
        portalConversion,
        portalEnabled,
    ]);

    // The details shown on the review page, and whether any which are required are still to be given.
    const conversionValues = editedConversion ?? existingDetails();
    const conversionMissing =
        missingConversionFields(conversionConfiguration?.requestedDataItems ?? [], conversionValues).length > 0;
    // A signed in customer's email address is who they are, so it can't be changed here.
    const lockedConversionIds = useMemo(() => {
        const email = conversionConfiguration?.requestedDataItems?.find(
            (item) => item.type === ConversionDataType.Email,
        );
        return customer && email ? [fieldId(email)] : [];
    }, [conversionConfiguration, customer]);

    // A page can be returned to once it has been reached, as long as what it needs still exists.
    const canVisit = (index: number) => {
        const target = steps[index].page;
        if (completion || pageRank(target) > reachedRank || target === page) return false;
        switch (target) {
            case "collection":
                return true;
            case "product":
                return !!collection;
            case "workflow":
                return !!product;
            case "experience":
            case "shared":
            case "review":
                return !!experienceToOpen();
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
            {page !== "welcome" && (
                <PageStepper
                    steps={steps.map((pageStep) => pageStep.label)}
                    currentIndex={stepIndex(page)}
                    enabledSteps={steps.map((_, index) => canVisit(index))}
                    onStepSelected={(index) => {
                        setErrorMessage(undefined);
                        const target = steps[index].page;
                        if (target === "experience" || target === "shared" || target === "review") {
                            setExperience(experienceToOpen());
                        }
                        setPage(target);
                    }}
                    actions={
                        portalEnabled ? (
                            <>
                                {portalSaveAndExit !== false && switcherExperiences.length > 0 && (
                                    <DetailsButton disabled={saveAndExitOpen} onClick={() => setSaveAndExitOpen(true)}>
                                        Save and exit
                                        <LogOut size={16} aria-hidden="true" />
                                    </DetailsButton>
                                )}
                                {orderDetailFields.length > 0 && (
                                    <DetailsButton
                                        disabled={!!pendingOrderDetails}
                                        onClick={() => setPendingOrderDetails({ resolve: () => {} })}
                                    >
                                        Order details
                                        <ClipboardList size={16} aria-hidden="true" />
                                    </DetailsButton>
                                )}
                                <DetailsButton disabled={accountOpen} onClick={() => openAccount()}>
                                    {customer ? customer.emailAddress : "Sign in"}
                                    <CircleUserRound size={16} aria-hidden="true" />
                                </DetailsButton>
                            </>
                        ) : manualConversionAvailable ? (
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
            )}
            {bundle.getTest() && <TestOrderBanner />}
            {errorMessage && <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(undefined)} />}
            <div style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden", position: "relative" }}>
                {page === "welcome" && (
                    <WelcomePage
                        onStart={handleWelcomeStart}
                        onOpenAccount={openAccount}
                        brandingAvailable={!!bundle.getGlobalPropertyConfiguration()}
                    />
                )}
                {page === "collection" &&
                    (autoSelectCollection ? (
                        <LoadingOverlay />
                    ) : (
                        <ProductCollectionSelector
                            selectedCollectionId={collection?.getId()}
                            onCollectionSelected={handleCollectionSelected}
                        />
                    ))}
                {page === "product" && collection && singleMode && (
                    <SingleProductSelector
                        collection={collection}
                        selectedProductId={product?.getId()}
                        onProductSelected={handleProductSelected}
                    />
                )}
                {page === "workflow" && startingPreset && <LoadingOverlay />}
                {page === "workflow" && product && !startingPreset && (
                    <WorkflowSelector
                        product={product}
                        selectedWorkflowId={workflow?.getId()}
                        onWorkflowSelected={handleWorkflowSelected}
                    />
                )}
                {page === "product" && collection && !singleMode && (
                    <ProductSelector
                        collection={collection}
                        experiences={cartExperiences}
                        onProductAdded={handleProductAdded}
                        onExperienceRemoved={handleExperienceRemoved}
                        onQuantityChanged={handleQuantityChanged}
                        onContinue={handleContinue}
                    />
                )}
                {page === "experience" && experience && (
                    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        {switcherExperiences.length > 1 && (
                            <ExperienceSwitcher
                                experiences={switcherExperiences}
                                active={experience}
                                // Products added to a design are only grouped under it when building a cart.
                                groupChildren={!singleMode}
                                onSelect={setExperience}
                            />
                        )}
                        <div style={{ flex: "1 1 0", minHeight: 0 }}>
                            <Customization
                                key={experience.getTransaction().id}
                                workflowExperience={experience}
                                onNext={handleFinish}
                                onNextProduct={nextExperience ? () => setExperience(nextExperience) : undefined}
                                nextPage={personalizeSuccessor("experience")}
                                onRequestQuote={handleRequestQuote}
                                onOpenExperience={setExperience}
                                onUpdatingChange={handleProductsUpdating}
                            />
                        </div>
                    </div>
                )}
                {page === "shared" && experience && (
                    <SharedPersonalization
                        key={templateRevision}
                        experience={experience}
                        experiences={switcherExperiences}
                        groupChildren={!singleMode}
                        onSelectExperience={setExperience}
                        onNext={handleSharedFinish}
                        nextLabel={
                            nextAfter("shared") === "experience"
                                ? "Continue"
                                : nextAfter("shared") === "review"
                                  ? "Review your design"
                                  : allowCart
                                    ? addToCartLabel || "Complete Design"
                                    : undefined
                        }
                        allowQuote={allowQuote && !["experience", "review"].includes(nextAfter("shared") ?? "")}
                        onRequestQuote={handleRequestQuote}
                    />
                )}
                {page === "review" && switcherExperiences.length > 0 && (
                    <ReviewPage
                        conversion={
                            portalConversion
                                ? {
                                      fields: conversionConfiguration?.requestedDataItems ?? [],
                                      values: conversionValues,
                                      lockedIds: lockedConversionIds,
                                      onChange: (id, value) =>
                                          setEditedConversion({ ...conversionValues, [id]: value }),
                                      cartBlocked: !!conversionConfiguration?.mandatory && conversionMissing,
                                      quoteBlocked: conversionMissing,
                                  }
                                : undefined
                        }
                        experiences={switcherExperiences}
                        onConfirm={completeDesign}
                        confirmLabel={addToCartLabel}
                        allowCart={allowCart}
                        allowQuote={allowQuote}
                        onRequestQuote={handleRequestQuote}
                    />
                )}
                {page === "thankyou" && completion && (
                    <ThankYouPage
                        message={thankYouMessage}
                        closeLabel={thankYouCloseLabel}
                        quoteId={completion.kind === "quote" ? completion.quoteId : undefined}
                        onPrepare={prepareHandOff}
                        onStartOver={thankYouShowStartOver === false ? undefined : startNewBundle}
                        startOverLabel={thankYouStartOverLabel}
                    />
                )}
            </div>
            {pendingOrderDetails && (
                <OrderDetailsDialog
                    onClose={(saved) => {
                        pendingOrderDetails.resolve(saved);
                        setPendingOrderDetails(undefined);
                    }}
                />
            )}
            {accountOpen && (
                <AccountDialog
                    initialPage={accountPage}
                    onClose={() => setAccountOpen(false)}
                    onTemplateApplied={() => {
                        setTemplateRevision((revision) => revision + 1);
                        if (page === "welcome") {
                            // Branding is applied to start an order with, so carry on once it has been seen to apply.
                            setTimeout(() => {
                                setAccountOpen(false);
                                void handleWelcomeStart();
                            }, 1200);
                        }
                    }}
                />
            )}
            {saveAndExitOpen && (
                <SaveAndExitDialog onClose={() => setSaveAndExitOpen(false)} onSaved={exitAfterSaving} />
            )}
            {guestPromptOpen && !accountOpen && (
                <GuestEmailDialog
                    enforceLogin={!!portalEnforceLogin}
                    onEmailProvided={async (email) => {
                        await bundle.addStakeholder({ emailAddress: email }, StakeholderType.Owner);
                        closeGuestPrompt();
                    }}
                    onContinueAsGuest={closeGuestPrompt}
                />
            )}
            {pendingConversion && (
                <ConversionDialog
                    // A quote can be cancelled, but it can't go ahead without the customer's details.
                    mandatory={
                        !pendingConversion.quote && !pendingConversion.manual && !!conversionConfiguration?.mandatory
                    }
                    initialValues={pendingConversion.initialValues}
                    lockedIds={lockedConversionIds}
                    submitLabel={
                        pendingConversion.collect
                            ? undefined
                            : pendingConversion.quote
                              ? "Confirm your quote"
                              : pendingConversion.manual
                                ? "Save"
                                : undefined
                    }
                    submittingLabel={
                        pendingConversion.quote && !pendingConversion.collect ? "Requesting quote..." : undefined
                    }
                    onSubmit={async (details) => {
                        await (pendingConversion.quote && !pendingConversion.collect
                            ? confirmQuote(details)
                            : saveConversionDetails(details));
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
