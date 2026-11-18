import { FunctionComponent, useEffect, useState } from "react";
import { StakeholderType } from "@spiffcommerce/core";
import Button from "./button";
import ErrorBanner from "./ErrorBanner";
import useAccount from "../hooks/useAccount";
import useBundle from "../hooks/useBundle";
import useThemeConfiguration from "../hooks/useThemeConfiguration";
import { isEmail } from "../utils/email";
import { Backdrop, Checkbox, Dialog, Header, Input, Muted, TextButton, Title } from "./dialogParts";

/**
 * Keeps the design as a draft and leaves it. The customer can name it, and if nobody is signed in and the bundle has
 * no owner yet they give their email address, so the draft can be found again. When the design has shared options they
 * can also keep them as saved branding, to use on another order.
 */
const SaveAndExitDialog: FunctionComponent<{
    onClose: () => void;
    /** Leaves, once the draft has been saved, signing the customer out if they chose to be. */
    onSaved: (options: { signOut: boolean }) => void | Promise<void>;
}> = ({ onClose, onSaved }) => {
    const bundle = useBundle();
    const { customer } = useAccount();
    const [name, setName] = useState(bundle.getName() ?? "");
    const [email, setEmail] = useState("");
    // Whether the bundle already belongs to someone, which isn't known until it has been asked.
    const [owned, setOwned] = useState<boolean | undefined>(undefined);
    const [saveTemplate, setSaveTemplate] = useState(false);
    // Kept so that trying again after a failure doesn't make a second template.
    const [templateSaved, setTemplateSaved] = useState(false);
    // Whether a signed in customer chooses to be signed out as they leave. They stay signed in unless they say
    // otherwise, unless the theme says they're always signed out (for shared screens).
    const { portalAllowStaySignedIn } = useThemeConfiguration();
    const alwaysSignOut = portalAllowStaySignedIn === false;
    const [signOutOnExit, setSignOutOnExit] = useState(false);
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
    // Branding is the shared options, which only some activations have. A template belongs to a signed in customer: core
    // won't make one for a guest who has only given their email address.
    const templateAvailable = !!customer && !!bundle.getGlobalPropertyConfiguration();
    const ready = owned !== undefined && (!needsEmail || isEmail(email)) && (!saveTemplate || name.trim() !== "");

    const save = async () => {
        setSaving(true);
        setError(undefined);
        try {
            if (name.trim() !== (bundle.getName() ?? "")) await bundle.setName(name.trim());
            if (needsEmail) {
                await bundle.addStakeholder({ emailAddress: email.trim() }, StakeholderType.Owner);
                // So that trying again after a failure further on doesn't add them a second time.
                setOwned(true);
            }
            if (saveTemplate && !templateSaved) {
                // Saved under the order's name, as templates are listed apart from orders.
                await bundle.convertToTemplate(name.trim());
                setTemplateSaved(true);
            }
            await onSaved({ signOut: !!customer && (alwaysSignOut || signOutOnExit) });
        } catch (caught) {
            console.error("Error saving the draft:", caught);
            setError(
                saveTemplate && !templateSaved
                    ? "We couldn't save your branding as a template. Please try again, or leave it unticked to save the draft without it."
                    : "We couldn't save your draft. Please try again.",
            );
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
                    {templateAvailable && (
                        <Checkbox>
                            <input
                                type="checkbox"
                                checked={saveTemplate}
                                disabled={saving || templateSaved}
                                onChange={(event) => setSaveTemplate(event.target.checked)}
                            />
                            Also save my branding as a template
                        </Checkbox>
                    )}
                    {templateAvailable && saveTemplate && name.trim() === "" && (
                        <Muted>The template is saved under the order's name, so give it one above.</Muted>
                    )}
                    {customer && alwaysSignOut && <Muted>You'll be signed out when you exit.</Muted>}
                    {customer && !alwaysSignOut && (
                        <Checkbox>
                            <input
                                type="checkbox"
                                checked={signOutOnExit}
                                disabled={saving}
                                onChange={(event) => setSignOutOnExit(event.target.checked)}
                            />
                            Sign me out when I exit
                        </Checkbox>
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
