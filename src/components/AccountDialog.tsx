import { FunctionComponent, useCallback, useEffect, useRef, useState } from "react";
import type { BundleRaw, GlobalPropertyTemplate } from "@spiffcommerce/core";
import Button from "./button";
import ErrorBanner from "./ErrorBanner";
import useAccount from "../hooks/useAccount";
import useBundle from "../hooks/useBundle";
import useClient from "../hooks/useClient";
import useOrderDetailFields from "../hooks/useOrderDetails";
import { EMPTY_ORDER_DETAILS } from "../utils/orderDetails";
import OrderDetailsForm from "./OrderDetailsForm";
import { Backdrop, Dialog, Header, Input, List, Muted, Row, RowText, MenuItem, TextButton, Title } from "./dialogParts";

const PAGE_SIZE = 10;

const errorMessageOf = (caught: unknown, fallback: string) => (caught instanceof Error && caught.message) || fallback;

/** Asks for the customer's email address, then the code sent to it. */
export const SignIn: FunctionComponent = () => {
    const { sendVerificationCode, submitVerificationCode } = useAccount();
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [codeSent, setCodeSent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);

    const send = async () => {
        setBusy(true);
        setError(undefined);
        try {
            await sendVerificationCode(email.trim());
            setCodeSent(true);
        } catch (caught) {
            console.error("Error sending the verification code:", caught);
            setError("We couldn't send a code to that email address. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    const submit = async () => {
        setBusy(true);
        setError(undefined);
        try {
            if (!(await submitVerificationCode(email.trim(), code.trim()))) {
                setError("That code wasn't right. Please check it and try again.");
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                void (codeSent ? submit() : send());
            }}
        >
            {error && <ErrorBanner message={error} onDismiss={() => setError(undefined)} />}
            {codeSent ? (
                <>
                    <Muted>We've emailed a code to {email.trim()}. Enter it below to sign in.</Muted>
                    <Input
                        aria-label="Verification code"
                        autoComplete="one-time-code"
                        autoFocus
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                    />
                    <Button type="submit" fullWidth disabled={busy || !code.trim()}>
                        {busy ? "Checking..." : "Sign in"}
                    </Button>
                    <Muted>
                        <TextButton type="button" disabled={busy} onClick={() => void send()}>
                            Send a new code
                        </TextButton>
                    </Muted>
                </>
            ) : (
                <>
                    <Muted>Sign in to continue a draft, or to start from one of your previous orders.</Muted>
                    <Input
                        type="email"
                        aria-label="Email address"
                        placeholder="john@example.com"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />
                    <Button type="submit" fullWidth disabled={busy || !email.includes("@")}>
                        {busy ? "Sending..." : "Send me a code"}
                    </Button>
                </>
            )}
        </form>
    );
};

/** A page at a time of the customer's bundles, each with a button to act on it. */
const BundleList: FunctionComponent<{
    ordered: boolean;
    emptyMessage: string;
    actionLabel: string;
    busyLabel: string;
    onAction: (bundle: BundleRaw) => Promise<void>;
}> = ({ ordered, emptyMessage, actionLabel, busyLabel, onAction }) => {
    const client = useClient();
    const current = useBundle();
    const [items, setItems] = useState<BundleRaw[]>([]);
    const [total, setTotal] = useState(0);
    // The number of bundles asked for so far, counting those which were left out because they're empty.
    const requested = useRef(0);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState<string | undefined>(undefined);
    const [error, setError] = useState<string | undefined>(undefined);

    const loadMore = useCallback(async () => {
        setLoading(true);
        setError(undefined);
        try {
            const result = await client.getBundlesForCustomer({
                ordered,
                template: false,
                limit: PAGE_SIZE,
                offset: requested.current,
            });
            requested.current += result.items.length;
            // A bundle with no designs in it is nothing worth coming back to.
            const useful = result.items.filter((item) => (item.transactionsCount ?? 0) > 0);
            setItems((previous) => [...previous, ...useful]);
            setTotal(result.total);
        } catch (caught) {
            console.error("Error loading the customer's bundles:", caught);
            setError("We couldn't load your bundles. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [client, ordered]);

    useEffect(() => {
        void loadMore();
        // Only the first page is loaded on its own.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const act = async (item: BundleRaw) => {
        setWorking(item.id);
        setError(undefined);
        try {
            await onAction(item);
        } catch (caught) {
            console.error("Error opening the bundle:", caught);
            setError(errorMessageOf(caught, "We couldn't open that. Please try again."));
            setWorking(undefined);
        }
    };

    return (
        <>
            {error && <ErrorBanner message={error} onDismiss={() => setError(undefined)} />}
            {!loading && items.length === 0 && !error && <Muted>{emptyMessage}</Muted>}
            <List>
                {items.map((item) => (
                    <Row key={item.id}>
                        <RowText>
                            <strong>{item.name || "Unnamed order"}</strong>
                            <span>
                                {item.transactionsCount} {item.transactionsCount === 1 ? "design" : "designs"} ·{" "}
                                {new Date(item.updatedAt).toLocaleDateString()}
                            </span>
                        </RowText>
                        <Button
                            disabled={!!working || (!ordered && current.getId() === item.id)}
                            onClick={() => void act(item)}
                        >
                            {working === item.id ? busyLabel : actionLabel}
                        </Button>
                    </Row>
                ))}
            </List>
            {loading && <Muted>Loading...</Muted>}
            {!loading && requested.current < total && (
                <Button fullWidth disabled={!!working} onClick={() => void loadMore()}>
                    Load more
                </Button>
            )}
        </>
    );
};

/**
 * The customer's saved branding: the shared options of a design, kept to be applied to another. Only templates made
 * from the same Global Property Configuration as the current bundle can be applied to it.
 */
const TemplateList: FunctionComponent<{ onApplied: () => void }> = ({ onApplied }) => {
    const client = useClient();
    const bundle = useBundle();
    const configurationId = bundle.getGlobalPropertyConfiguration()?.id;
    const [items, setItems] = useState<GlobalPropertyTemplate[]>([]);
    const [total, setTotal] = useState(0);
    const requested = useRef(0);
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState<string | undefined>(undefined);
    const [error, setError] = useState<string | undefined>(undefined);
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);

    const loadMore = useCallback(async () => {
        setLoading(true);
        setError(undefined);
        try {
            const result = await client.getTemplatesForCustomer({
                limit: PAGE_SIZE,
                offset: requested.current,
                globalPropertyConfigurationId: configurationId,
            });
            requested.current += result.items.length;
            setItems((previous) => [...previous, ...result.items]);
            setTotal(result.total);
        } catch (caught) {
            console.error("Error loading the customer's templates:", caught);
            setError("We couldn't load your saved branding. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [client, configurationId]);

    useEffect(() => {
        void loadMore();
        // Only the first page is loaded on its own.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const apply = async (template: GlobalPropertyTemplate) => {
        setWorking(template.getId());
        setError(undefined);
        try {
            await template.applyToBundle(bundle);
            const metadata = new Map(bundle.getMetadata());
            metadata.set("template", template.getName());
            await bundle.setMetadata(metadata);
            onApplied();
        } catch (caught) {
            console.error("Error applying the template:", caught);
            setError("We couldn't apply that branding. Please try again.");
        } finally {
            setWorking(undefined);
        }
    };

    const remove = async (template: GlobalPropertyTemplate) => {
        if (!window.confirm(`Remove "${template.getName()}"?`)) return;
        setWorking(template.getId());
        setError(undefined);
        try {
            await template.delete();
            requested.current = Math.max(0, requested.current - 1);
            setItems((previous) => previous.filter((item) => item !== template));
            setTotal((previous) => Math.max(0, previous - 1));
        } catch (caught) {
            console.error("Error removing the template:", caught);
            setError("We couldn't remove that branding. Please try again.");
        } finally {
            setWorking(undefined);
        }
    };

    const save = async () => {
        setSaving(true);
        setError(undefined);
        try {
            const saved = await bundle.convertToTemplate(name.trim());
            setItems((previous) => [saved, ...previous]);
            requested.current += 1;
            setTotal((previous) => previous + 1);
            setName("");
        } catch (caught) {
            console.error("Error saving the template:", caught);
            setError("We couldn't save your branding. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {error && <ErrorBanner message={error} onDismiss={() => setError(undefined)} />}
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    void save();
                }}
            >
                <Muted>Save this design's shared options to use them again on another order.</Muted>
                <Input
                    aria-label="Template name"
                    placeholder="Name your branding"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                />
                <Button type="submit" fullWidth disabled={saving || !name.trim() || !!working}>
                    {saving ? "Saving..." : "Save current branding"}
                </Button>
            </form>
            {!loading && items.length === 0 && !error && <Muted>You have no saved branding yet.</Muted>}
            <List>
                {items.map((item) => (
                    <Row key={item.getId()}>
                        <RowText>
                            <strong>{item.getName() || "Unnamed branding"}</strong>
                            <span>
                                {item.getUpdatedDate().toLocaleDateString()} ·{" "}
                                <TextButton type="button" disabled={!!working} onClick={() => void remove(item)}>
                                    Remove
                                </TextButton>
                            </span>
                        </RowText>
                        <Button disabled={!!working || saving} onClick={() => void apply(item)}>
                            {working === item.getId() ? "Applying..." : "Apply"}
                        </Button>
                    </Row>
                ))}
            </List>
            {loading && <Muted>Loading...</Muted>}
            {!loading && requested.current < total && (
                <Button fullWidth disabled={!!working} onClick={() => void loadMore()}>
                    Load more
                </Button>
            )}
        </>
    );
};

type AccountPage = "menu" | "drafts" | "orders" | "templates";

/**
 * The corporate portal. Customers sign in with a code sent to their email, then from the menu can pick a draft up where
 * they left it, duplicate one of their previous orders, or apply their saved branding.
 */
const AccountDialog: FunctionComponent<{
    onClose: () => void;
    /** Called once a saved branding template has been applied to the bundle. */
    onTemplateApplied: () => void;
}> = ({ onClose, onTemplateApplied }) => {
    const { customer, signOut, openDraft, duplicateBundle } = useAccount();
    const bundle = useBundle();
    const orderDetailFields = useOrderDetailFields();
    // Branding is the shared options, which only some activations have.
    const templatesAvailable = !!bundle.getGlobalPropertyConfiguration();
    const [page, setPage] = useState<AccountPage>("menu");
    // The previous order being duplicated, while the customer is asked for the new order's details.
    const [reorder, setReorder] = useState<BundleRaw | undefined>(undefined);
    const [signOutError, setSignOutError] = useState<string | undefined>(undefined);
    const [signingOut, setSigningOut] = useState(false);

    const handleSignOut = async () => {
        setSigningOut(true);
        setSignOutError(undefined);
        try {
            await signOut();
            setPage("menu");
        } catch (caught) {
            console.error("Error signing out:", caught);
            setSignOutError("We couldn't sign you out. Please try again.");
        } finally {
            setSigningOut(false);
        }
    };

    const back = () => (reorder ? setReorder(undefined) : setPage("menu"));

    const renderSignedIn = () => {
        if (reorder) {
            return (
                <>
                    <Muted>Tell us about the new order. Your previous order is copied, designs included.</Muted>
                    <OrderDetailsForm
                        fields={orderDetailFields}
                        initialValues={EMPTY_ORDER_DETAILS}
                        collection={reorder.productCollection}
                        submitLabel="Duplicate"
                        submittingLabel="Duplicating..."
                        onSubmit={async (details) => {
                            await duplicateBundle(reorder.id!, details);
                            onClose();
                        }}
                    />
                </>
            );
        }
        switch (page) {
            case "drafts":
                return (
                    <BundleList
                        ordered={false}
                        emptyMessage="You have no drafts yet."
                        actionLabel="Continue"
                        busyLabel="Opening..."
                        onAction={async (item) => {
                            await openDraft(item.id!);
                            onClose();
                        }}
                    />
                );
            case "orders":
                return (
                    <BundleList
                        ordered
                        emptyMessage="You have no previous orders yet."
                        actionLabel="Duplicate"
                        busyLabel="Duplicating..."
                        onAction={async (item) => {
                            // Order details the partner asks for are given before the copy is made.
                            if (orderDetailFields.length > 0) {
                                setReorder(item);
                                return;
                            }
                            await duplicateBundle(item.id!);
                            onClose();
                        }}
                    />
                );
            case "templates":
                return <TemplateList onApplied={onTemplateApplied} />;
            default:
                return (
                    <>
                        {signOutError && (
                            <ErrorBanner message={signOutError} onDismiss={() => setSignOutError(undefined)} />
                        )}
                        <MenuItem type="button" onClick={() => setPage("drafts")}>
                            <strong>Draft orders</strong>
                            <span>Pick up an order where you left it.</span>
                        </MenuItem>
                        <MenuItem type="button" onClick={() => setPage("orders")}>
                            <strong>Previous orders</strong>
                            <span>Start a new order from one you've already placed.</span>
                        </MenuItem>
                        {templatesAvailable && (
                            <MenuItem type="button" onClick={() => setPage("templates")}>
                                <strong>Saved branding</strong>
                                <span>Apply, save or remove your saved branding.</span>
                            </MenuItem>
                        )}
                        <MenuItem type="button" disabled={signingOut} onClick={() => void handleSignOut()}>
                            <strong>{signingOut ? "Signing out..." : "Sign out"}</strong>
                            <span>
                                Signed in as {customer?.emailAddress}. Your current design is cleared from this screen.
                            </span>
                        </MenuItem>
                    </>
                );
        }
    };

    const heading = reorder
        ? "Duplicate order"
        : page === "drafts"
          ? "Draft orders"
          : page === "orders"
            ? "Previous orders"
            : page === "templates"
              ? "Saved branding"
              : "My account";

    return (
        <Backdrop>
            <Dialog role="dialog" aria-modal="true" aria-labelledby="account-title">
                <Header>
                    <Title id="account-title">{customer ? heading : "Sign in"}</Title>
                    <TextButton type="button" onClick={onClose}>
                        Close
                    </TextButton>
                </Header>
                {customer ? (
                    <>
                        {(page !== "menu" || reorder) && (
                            <Muted>
                                <TextButton type="button" onClick={back}>
                                    ← {reorder ? "Previous orders" : "Menu"}
                                </TextButton>
                            </Muted>
                        )}
                        {renderSignedIn()}
                    </>
                ) : (
                    <SignIn />
                )}
            </Dialog>
        </Backdrop>
    );
};

export default AccountDialog;
