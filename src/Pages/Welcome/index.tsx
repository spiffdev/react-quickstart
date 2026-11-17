import { FunctionComponent } from "react";
import styled from "styled-components";
import Button from "../../components/button";
import Typography from "../../components/typography";
import useThemeConfiguration from "../../hooks/useThemeConfiguration";
import useAccount from "../../hooks/useAccount";
import type { AccountPage } from "../../components/AccountDialog";

const Page = styled.div<{ $image?: string }>`
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 24px 16px;
    text-align: center;
    background-color: var(--theme-background-color, #fff);
    background-image: ${(props) => (props.$image ? `url("${props.$image.replace(/"/g, "%22")}")` : "none")};
    background-position: center;
    background-size: cover;
`;

const Card = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
    max-width: 440px;
    padding: 32px 24px;
    box-sizing: border-box;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
`;

const Heading = styled(Typography)`
    margin: 0;
    font-size: 28px;
    font-weight: 600;
`;

const Text = styled(Typography)`
    margin: 0 0 8px;
    font-size: 16px;
    white-space: pre-line;
`;

const Secondary = styled(Button)`
    color: var(--theme-primary-color);
    background-color: transparent;

    &:hover:not(:disabled) {
        color: var(--theme-primary-contrast-color);
    }
`;

/**
 * The first page, when the partner has switched it on. Starts a new order or, with the user portal, goes
 * somewhere in the customer's account instead.
 */
const WelcomePage: FunctionComponent<{
    onStart: () => void;
    /** Opens the account dialog at a page, which is the sign in form until the customer has signed in. */
    onOpenAccount: (page: AccountPage) => void;
    /** Whether the activation has shared options, which is what saved branding is made of. */
    brandingAvailable: boolean;
}> = ({ onStart, onOpenAccount, brandingAvailable }) => {
    const {
        welcomeTitle,
        welcomeDescription,
        welcomeBackgroundImage,
        welcomeStartLabel,
        welcomeBrandingLabel,
        welcomeDuplicateLabel,
        welcomeContinueLabel,
        welcomeSignInLabel,
    } = useThemeConfiguration();
    const { enabled: portalEnabled, customer } = useAccount();

    return (
        <Page $image={welcomeBackgroundImage?.fileLink ?? undefined}>
            <Card>
                <Heading variant="h2">{welcomeTitle || "Welcome"}</Heading>
                <Text>{welcomeDescription || "Start a new order, or pick up where you left off."}</Text>
                <Button fullWidth onClick={onStart}>
                    {welcomeStartLabel || "Start a new order"}
                </Button>
                {portalEnabled && (
                    <>
                        {brandingAvailable && (
                            <Secondary fullWidth onClick={() => onOpenAccount("templates")}>
                                {welcomeBrandingLabel || "Use saved branding"}
                            </Secondary>
                        )}
                        <Secondary fullWidth onClick={() => onOpenAccount("orders")}>
                            {welcomeDuplicateLabel || "Duplicate a previous order"}
                        </Secondary>
                        <Secondary fullWidth onClick={() => onOpenAccount(customer ? "drafts" : "menu")}>
                            {customer ? welcomeContinueLabel || "Continue a draft" : welcomeSignInLabel || "Sign in"}
                        </Secondary>
                    </>
                )}
            </Card>
        </Page>
    );
};

export default WelcomePage;
