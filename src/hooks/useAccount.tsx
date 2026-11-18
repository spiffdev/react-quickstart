import { getGlobalPropertyStateForBundle, StakeholderType, type Customer } from "@spiffcommerce/core";
import {
    createContext,
    FunctionComponent,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import useBundle, { useSetBundle, useStartNewBundle } from "./useBundle";
import useOrderDetailFields from "./useOrderDetails";
import { applyOrderDetails, type OrderDetails } from "../utils/orderDetails";
import useClient from "./useClient";
import useThemeConfiguration from "./useThemeConfiguration";

/** What a customer can change about themselves. Their email address is how they sign in, so it isn't here. */
export interface CustomerDetails {
    firstName: string;
    lastName: string;
    phoneNumber: string;
}

interface AccountContextType {
    /** Whether the user portal is switched on. When it is, the conversion configuration isn't used at all. */
    enabled: boolean;
    /** The signed in customer, if any. */
    customer: Customer | undefined;
    sendVerificationCode: (emailAddress: string) => Promise<void>;
    /** Resolves true when the code was accepted, in which case the current bundle now belongs to the customer. */
    submitVerificationCode: (emailAddress: string, code: string) => Promise<boolean>;
    /**
     * Signs out, and replaces the bundle with a new one so the next customer doesn't see this one's design. Not
     * replacing it is for when the experience is about to close.
     */
    signOut: (options?: { startNewBundle?: boolean }) => Promise<void>;
    /** Updates the signed in customer's own details. All of them are sent, as anything left out is cleared. */
    updateDetails: (details: CustomerDetails) => Promise<void>;
    /** Starts over for the next customer: signs out if anyone is, and replaces the bundle with a new one. */
    resetSession: () => Promise<void>;
    /** Re-opens one of the customer's draft bundles in place of the current one. */
    openDraft: (bundleId: string) => Promise<void>;
    /**
     * Copies one of the customer's previous bundles, designs included, and works on the copy. The order details,
     * which are only the ones the partner has switched on, are recorded on the copy.
     */
    duplicateBundle: (bundleId: string, details?: OrderDetails) => Promise<void>;
}

const AccountContext = createContext<AccountContextType>({
    enabled: false,
    customer: undefined,
    sendVerificationCode: async () => {},
    submitVerificationCode: async () => false,
    signOut: async () => {},
    updateDetails: async () => {},
    resetSession: async () => {},
    openDraft: async () => {},
    duplicateBundle: async () => {},
});

const useAccount = () => useContext(AccountContext);

/** Whether the user portal is on. */
export const useUserPortalEnabled = () => useContext(AccountContext).enabled;

export const AccountProvider: FunctionComponent<{ children: ReactNode }> = ({ children }) => {
    const client = useClient();
    const bundle = useBundle();
    const setBundle = useSetBundle();
    const startNewBundle = useStartNewBundle();
    const orderDetailFields = useOrderDetailFields();
    const { enableUserPortal, enableTestOrders } = useThemeConfiguration();
    const enabled = !!enableUserPortal;
    const [customer, setCustomer] = useState<Customer | undefined>(undefined);

    // Resumes the customer's session from a previous visit.
    useEffect(() => {
        if (!enabled) return;
        let canceled = false;
        (async () => {
            try {
                await client.reloadLoggedInCustomer();
                const restored = client.getCustomer();
                if (canceled || !restored) return;
                // A customer of another partner can't be used here.
                const integration = await client.getIntegration().catch(() => undefined);
                if (integration?.partner?.id && restored.partner?.id !== integration.partner.id) {
                    await client.logOut();
                    return;
                }
                if (!canceled) setCustomer(restored);
            } catch (error) {
                console.error("Error restoring the customer's session:", error);
            }
        })();
        return () => {
            canceled = true;
        };
    }, [client, enabled]);

    // Attaches the bundle to the customer. A bundle which already has an owner (such as a re-opened draft) is left alone.
    useEffect(() => {
        if (!enabled || !customer?.emailAddress) return;
        let canceled = false;
        (async () => {
            try {
                const stakeholders = await bundle.getAllStakeholders();
                if (canceled || stakeholders.some((stakeholder) => stakeholder.type === StakeholderType.Owner)) return;
                await bundle.addStakeholder(
                    {
                        emailAddress: customer.emailAddress,
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                        phoneNumber: customer.phoneNumber,
                    },
                    StakeholderType.Owner,
                );
            } catch (error) {
                console.error("Error attaching the bundle to the customer:", error);
            }
        })();
        return () => {
            canceled = true;
        };
    }, [bundle, customer, enabled]);

    // A customer's default template is applied to their new bundles, as the corporate theme does by starting them from
    // a copy of it. Here the bundle is already there, so its shared options are set instead. A bundle which already has
    // designs (such as a draft) or has had branding applied is left alone, and each is only tried once.
    const defaultTemplateTried = useRef(new WeakSet<object>());
    useEffect(() => {
        const templateBundleId = customer?.defaultTemplateBundleId;
        if (!enabled || !templateBundleId || defaultTemplateTried.current.has(bundle)) return;
        if (bundle.getWorkflowExperiences().length > 0 || bundle.getMetadata().has("template")) return;
        defaultTemplateTried.current.add(bundle);
        (async () => {
            try {
                const state = await getGlobalPropertyStateForBundle(templateBundleId);
                if (!state) return;
                const template = await client.getExistingBundle(templateBundleId);
                await bundle.applyGlobalPropertyState(state);
                const metadata = new Map(bundle.getMetadata());
                metadata.set("template", template.getName());
                await bundle.setMetadata(metadata);
            } catch (error) {
                console.error("Error applying the customer's default template:", error);
            }
        })();
    }, [bundle, client, customer, enabled]);

    const sendVerificationCode = useCallback(
        (emailAddress: string) => client.generateVerificationCode(emailAddress),
        [client],
    );

    const submitVerificationCode = useCallback(
        async (emailAddress: string, code: string) => {
            try {
                await client.verifyCode(emailAddress, code);
            } catch (error) {
                console.error("The verification code was not accepted:", error);
                return false;
            }
            // The attaching effect picks the customer up from here.
            setCustomer(client.getCustomer() ?? { emailAddress });
            return true;
        },
        [client],
    );

    const signOut = useCallback(
        async ({ startNewBundle: startNew = true }: { startNewBundle?: boolean } = {}) => {
            await client.logOut();
            setCustomer(undefined);
            if (startNew) await startNewBundle();
        },
        [client, startNewBundle],
    );

    const updateDetails = useCallback(
        async (details: CustomerDetails) => {
            // A blank value is sent as nothing, which clears it.
            const updated = await client.updateCustomer({
                firstName: details.firstName.trim() || undefined,
                lastName: details.lastName.trim() || undefined,
                phoneNumber: details.phoneNumber.trim() || undefined,
            });
            setCustomer(updated);
        },
        [client],
    );

    const resetSession = useCallback(async () => {
        if (customer) await signOut();
        else await startNewBundle();
    }, [customer, signOut, startNewBundle]);

    const bundleOptions = useMemo(() => ({ test: enableTestOrders || undefined }), [enableTestOrders]);

    const openDraft = useCallback(
        async (bundleId: string) => {
            setBundle(await client.getExistingBundle(bundleId, undefined, undefined, bundleOptions));
        },
        [bundleOptions, client, setBundle],
    );

    const duplicateBundle = useCallback(
        async (bundleId: string, details?: OrderDetails) => {
            const duplicate = await client.duplicateBundle(bundleId, false, true, bundleOptions);
            const copy = await duplicate();
            if (details) await applyOrderDetails(copy, orderDetailFields, details);
            setBundle(copy);
        },
        [bundleOptions, client, orderDetailFields, setBundle],
    );

    const value = useMemo(
        () => ({
            enabled,
            customer,
            sendVerificationCode,
            submitVerificationCode,
            signOut,
            updateDetails,
            resetSession,
            openDraft,
            duplicateBundle,
        }),
        [
            customer,
            duplicateBundle,
            enabled,
            openDraft,
            resetSession,
            sendVerificationCode,
            signOut,
            submitVerificationCode,
            updateDetails,
        ],
    );

    return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};

export default useAccount;
