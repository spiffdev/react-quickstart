import { FunctionComponent, useEffect, useState } from "react";
import { StakeholderType } from "@spiffcommerce/core";
import Button from "./button";
import ErrorBanner from "./ErrorBanner";
import useAccount from "../hooks/useAccount";
import useBundle from "../hooks/useBundle";
import { isEmail } from "../utils/email";
import { Backdrop, Dialog, Header, Input, Muted, TextButton, Title } from "./dialogParts";

/**
 * Keeps the design as a draft and leaves it. The customer can name it, and if nobody is signed in and the bundle has
 * no owner yet they give their email address, so the draft can be found again.
 */
const SaveAndExitDialog: FunctionComponent<{
    onClose: () => void;
    /** Leaves, once the draft has been saved. */
    onSaved: () => void | Promise<void>;
}> = ({ onClose, onSaved }) => {
    const bundle = useBundle();
    const { customer } = useAccount();
    const [name, setName] = useState(bundle.getName() ?? "");
    const [email, setEmail] = useState("");
    // Whether the bundle already belongs to someone, which isn't known until it has been asked.
    const [owned, setOwned] = useState<boolean | undefined>(undefined);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);

    useEffect(() => {
        let canceled = false;
        bundle
            .getAllStakeholders()
            .then((stakeholders) => {
                if (!canceled) setOwned(stakeholders.some((stakeholder) => stakeholder.type === StakeholderType.Owner));
            })
            .catch((caught) => {
                console.error("Error checking who the draft belongs to:", caught);
                if (!canceled) setOwned(false);
            });
        return () => {
            canceled = true;
        };
    }, [bundle]);

    // A signed in customer is attached to the bundle as they sign in, so only a guest has to give an email address.
    const needsEmail = !customer && owned === false;
    const ready = owned !== undefined && (!needsEmail || isEmail(email));

    const save = async () => {
        setSaving(true);
        setError(undefined);
        try {
            if (name.trim() !== (bundle.getName() ?? "")) await bundle.setName(name.trim());
            if (needsEmail) await bundle.addStakeholder({ emailAddress: email.trim() }, StakeholderType.Owner);
            await onSaved();
        } catch (caught) {
            console.error("Error saving the draft:", caught);
            setError("We couldn't save your draft. Please try again.");
            setSaving(false);
        }
    };

    return (
        <Backdrop>
            <Dialog role="dialog" aria-modal="true" aria-labelledby="save-exit-title">
                <Header>
                    <Title id="save-exit-title">Save and exit</Title>
                    <TextButton type="button" disabled={saving} onClick={onClose}>
                        Cancel
                    </TextButton>
                </Header>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        void save();
                    }}
                >
                    {error && <ErrorBanner message={error} onDismiss={() => setError(undefined)} />}
                    <Muted>
                        {customer
                            ? "Your design is kept in your drafts, so you can carry on whenever you like."
                            : "Your design is kept as a draft, which you can come back to by signing in with your email address."}
                    </Muted>
                    <Input
                        aria-label="Order name"
                        placeholder="Name your order (optional)"
                        value={name}
                        disabled={saving}
                        onChange={(event) => setName(event.target.value)}
                    />
                    {needsEmail && (
                        <Input
                            type="email"
                            aria-label="Email address"
                            placeholder="john@example.com"
                            autoComplete="email"
                            value={email}
                            disabled={saving}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    )}
                    <Button type="submit" fullWidth disabled={saving || !ready}>
                        {saving ? "Saving..." : "Save and exit"}
                    </Button>
                </form>
            </Dialog>
        </Backdrop>
    );
};

export default SaveAndExitDialog;
