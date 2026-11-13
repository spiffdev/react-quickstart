import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import styled from "styled-components";
import { GlobalPropertyHandle, WorkflowExperience } from "@spiffcommerce/core";
import Button from "../../components/button";
import Card from "../../components/card";
import Typography from "../../components/typography";
import useBundle from "../../hooks/useBundle";
import useThemeConfiguration from "../../hooks/useThemeConfiguration";
import { MEDIA, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from "../../layout";
import ThreeDPreview from "../Customization/components/ThreeDPreview";
import LoadingOverlay from "../components/LoadingOverlay";
import { PropertyControl } from "./properties";

const DEFAULT_SIDEBAR_WIDTH_PERCENTAGE = 25;

const Layout = styled.div`
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: row;

    @media ${MEDIA.stacked} {
        flex-direction: column;
    }
`;

const PreviewPane = styled.div`
    flex: 1 1 0;
    min-width: 0;
    height: 100%;

    @media ${MEDIA.stacked} {
        flex: none;
        height: clamp(32dvh, 75vw, 42dvh);
    }
`;

const Sidebar = styled.div<{ $widthPercentage: number }>`
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    height: 100%;
    flex: 0 0 clamp(${SIDEBAR_MIN_WIDTH}px, ${(props) => props.$widthPercentage}%, ${SIDEBAR_MAX_WIDTH}px);

    @media ${MEDIA.stacked} {
        flex: 1 1 0;
        height: auto;
    }
`;

const Scroll = styled.div`
    flex: 1 1 0;
    min-height: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 5px;
    -webkit-overflow-scrolling: touch;
`;

const Heading = styled(Typography)`
    margin: 0 0 8px 0;
    font-size: var(--theme-scene-heading-size);
`;

const PropertyTitle = styled(Typography)`
    margin: 0;
    font-size: var(--theme-step-heading-size);
`;

const Required = styled.span`
    margin-left: 4px;
    color: #d32f2f;
`;

const Description = styled(Typography)`
    margin: 4px 0 0 0;
    font-size: 13px;
    color: #666;
`;

const Property = styled.div`
    padding: 8px 0;

    & + & {
        border-top: 1px solid #e0e0e0;
    }
`;

const Footer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid #e0e0e0;
    background-color: #fff;
`;

const ErrorText = styled(Typography)`
    margin: 0;
    font-size: 13px;
    color: #d32f2f;
`;

/**
 * Options shared by every product in the design, from the Global Property Configuration. A change here is applied to
 * every step which shares the property, in every product.
 */
const SharedPersonalisation: FunctionComponent<{
    /** The experience to show in the preview. */
    experience: WorkflowExperience;
    /** Moves on from this page. Rejects with a customer-readable message when that fails. */
    onNext: () => void | Promise<void>;
    /** What the button which moves on is called. Without one there's no such button (e.g. only quotes are allowed). */
    nextLabel?: string;
    /** When this page is the last before the design is completed, the customer may ask for a quote instead. */
    allowQuote?: boolean;
    onRequestQuote?: () => void | boolean | Promise<void | boolean>;
}> = ({ experience, onNext, nextLabel, allowQuote = false, onRequestQuote }) => {
    const bundle = useBundle();
    const sidebarWidthPercentage = useThemeConfiguration().sidebarWidthPercentage || DEFAULT_SIDEBAR_WIDTH_PERCENTAGE;
    const [handles, setHandles] = useState<GlobalPropertyHandle[] | undefined>(undefined);
    // Whether each property has had its mandatory value given changes as the customer works, and not in the handles.
    const [, setRevision] = useState(0);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        const load = () =>
            bundle
                .getGlobalProperties()
                .then((loaded) => !cancelled && setHandles(loaded.filter((handle) => !handle.isSilent())))
                .catch((loadError) => {
                    console.error("Error loading the shared properties:", loadError);
                    if (!cancelled) setHandles([]);
                });
        const refreshMandatory = () => setRevision((current) => current + 1);
        void load();
        // Answering one property can show or hide others.
        bundle.addEventListener("conditional-global-properties-changed", load);
        bundle.addEventListener("global-properties-mandatory-changed", refreshMandatory);
        return () => {
            cancelled = true;
            bundle.removeEventListener("conditional-global-properties-changed", load);
            bundle.removeEventListener("global-properties-mandatory-changed", refreshMandatory);
        };
    }, [bundle]);

    const incomplete = !!handles?.some((handle) => !handle.isMandatoryFulfilled());

    // Run the same way for continuing and quoting, as neither can go ahead while something is missing or updating.
    const run = useCallback(async (action: () => void | boolean | Promise<void | boolean>) => {
        setError("");
        setWorking(true);
        try {
            if ((await action()) === false) setWorking(false);
        } catch (actionError) {
            console.error("Error leaving the shared personalisation page:", actionError);
            setError(actionError instanceof Error ? actionError.message : "Something went wrong. Please try again.");
            setWorking(false);
        }
    }, []);

    const checked = useCallback(
        <T,>(action: () => T) =>
            () => {
                if (experience.getWorkflowManager().getUpdatesPending()) {
                    throw new Error("Your design is still updating. Please wait a moment and try again.");
                }
                return action();
            },
        [experience],
    );

    return (
        <Layout>
            <PreviewPane>
                <ThreeDPreview workflowExperience={experience} />
            </PreviewPane>
            <Sidebar $widthPercentage={sidebarWidthPercentage}>
                <Scroll>
                    {!handles ? (
                        <LoadingOverlay />
                    ) : (
                        <Card>
                            <Heading variant="h2">Shared options</Heading>
                            {handles.map((handle) => (
                                <Property key={handle.getName()}>
                                    <PropertyTitle variant="h3">
                                        {handle.getTitle()}
                                        {handle.isMandatory() && <Required aria-label="required">*</Required>}
                                    </PropertyTitle>
                                    {handle.getDescription() && <Description>{handle.getDescription()}</Description>}
                                    <PropertyControl handle={handle} />
                                </Property>
                            ))}
                        </Card>
                    )}
                </Scroll>
                <Footer>
                    {nextLabel && (
                        <Button
                            fullWidth
                            disabled={!handles || incomplete || working}
                            onClick={() => run(checked(onNext))}
                        >
                            {nextLabel}
                        </Button>
                    )}
                    {allowQuote && onRequestQuote && (
                        <Button
                            fullWidth
                            disabled={!handles || incomplete || working}
                            icon={<FileText size={18} aria-hidden="true" />}
                            onClick={() => run(checked(onRequestQuote))}
                        >
                            Request a Quote
                        </Button>
                    )}
                    {error && <ErrorText role="alert">{error}</ErrorText>}
                </Footer>
            </Sidebar>
        </Layout>
    );
};

export default SharedPersonalisation;
