import { FunctionComponent, useState } from "react";
import Button from "./button";
import ErrorBanner from "./ErrorBanner";
import { SignIn } from "./AccountDialog";
import { Backdrop, Dialog, Header, Input, Muted, TextButton, Title } from "./dialogParts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Offered to customers who haven't signed in, as they start personalising. They can give their email address (or sign
 * in with a code, when the theme enforces it), or carry on as a guest.
 */
const GuestEmailDialog: FunctionComponent<{
    enforceLogin: boolean;
    onEmailProvided: (email: string) => Promise<void>;
    onContinueAsGuest: () => void;
}> = ({ enforceLogin, onEmailProvided, onContinueAsGuest }) => {
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);

    const submit = async () => {
        if (!EMAIL_PATTERN.test(email.trim())) {
            setError("Please enter a valid email address.");
            return;
        }
        setBusy(true);
        setError(undefined);
        try {
            await onEmailProvided(email.trim());
        } catch (caught) {
            console.error("Error saving the customer's email address:", caught);
            setError("We couldn't save your email address. Please try again.");
            setBusy(false);
        }
    };

    return (
        <Backdrop>
            <Dialog role="dialog" aria-modal="true" aria-labelledby="guest-title">
                <Header>
                    <Title id="guest-title">{enforceLogin ? "Sign in" : "Your email address"}</Title>
                </Header>
                {enforceLogin ? (
                    <SignIn />
                ) : (
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            void submit();
                        }}
                    >
                        {error && <ErrorBanner message={error} onDismiss={() => setError(undefined)} />}
                        <Muted>Enter your email address so we can keep this order for you.</Muted>
                        <Input
                            type="email"
                            aria-label="Email address"
                            placeholder="john@example.com"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            disabled={busy}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                        <Button type="submit" fullWidth disabled={busy || !email}>
                            {busy ? "Saving..." : "Continue"}
                        </Button>
                    </form>
                )}
                <Muted>
                    <TextButton type="button" disabled={busy} onClick={onContinueAsGuest}>
                        Continue as guest
                    </TextButton>
                </Muted>
            </Dialog>
        </Backdrop>
    );
};

export default GuestEmailDialog;
