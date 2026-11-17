import { StakeholderType, type Customer } from "@spiffcommerce/core";
import {
    createContext,
    FunctionComponent,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import useBundle, { useSetBundle, useStartNewBundle } from "./useBundle";
import useOrderDetailFields from "./useOrderDetails";
import { applyOrderDetails, type OrderDetails } from "../utils/orderDetails";
import useClient from "./useClient";
import useThemeConfiguration from "./useThemeConfiguration";

interface AccountContextType {
    /** Whether the corporate portal is switched on. When it is, the conversion configuration isn't used at all. */
    enabled: boolean;
    /** The signed in customer, if any. */
    customer: Customer | undefined;
    sendVerificationCode: (emailAddress: string) => Promise<void>;
    /** Resolves true when the code was accepted, in which case the current bundle now belongs to the customer. */
    submitVerificationCode: (emailAddress: string, code: string) => Promise<boolean>;
    /** Signs out, and replaces the bundle with a new one so the next customer doesn't see this one's design. */
    signOut: () => Promise<void>;
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
    openDraft: async () => {},
    duplicateBundle: async () => {},
});

const useAccount = () => useContext(AccountContext);

/** Whether the corporate portal is on. */
export const useCorporatePortalEnabled = () => useContext(AccountContext).enabled;

export const AccountProvider: FunctionComponent<{ children: ReactNode }> = ({ children }) => {
    const client = useClient();
    const bundle = useBundle();
    const setBundle = useSetBundle();
    const startNewBundle = useStartNewBundle();
    const orderDetailFields = useOrderDetailFields();
    const { enableCorporatePortal, enableTestOrders } = useThemeConfiguration();
    const enabled = !!enableCorporatePortal;
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

    const signOut = useCallback(async () => {
        await client.logOut();
        setCustomer(undefined);
        await startNewBundle();
    }, [client, startNewBundle]);

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
            openDraft,
            duplicateBundle,
        }),
        [customer, duplicateBundle, enabled, openDraft, sendVerificationCode, signOut, submitVerificationCode],
    );

    return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};

export default useAccount;
