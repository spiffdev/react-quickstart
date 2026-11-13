import { FunctionComponent, ReactNode, useCallback, useMemo, useState } from "react";
import { AspectType, WorkflowExperience } from "@spiffcommerce/core";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import styled from "styled-components";
import Button from "../../../components/button";
import Typography from "../../../components/typography";
import useActivation from "../../../hooks/useActivation";
import useBundle from "../../../hooks/useBundle";
import { usePageEnabled } from "../../../hooks/useThemeConfiguration";

const Notice = styled.div`
    padding: 12px 16px;
    background: #f5f5f5;
    border-radius: 8px;
`;

const NoticeText = styled(Typography)`
    margin: 0 0 8px 0;
    font-size: 13px;
    color: #4d4f5c;
`;

const SmallButton = styled(Button)`
    padding: 6px 12px;
    font-size: 13px;
`;

const Wrapper = styled.div`
    position: relative;
`;

// Sits in the step's top right corner, level with its heading.
const RevertSlot = styled.div`
    position: absolute;
    top: 0;
    right: 0;
`;

/**
 * A step which uses a shared (global) property gets its value from the shared page, for every product. This lets the
 * customer override that for the one product: the step is shown for them to set as they like, and turning the override
 * off gives it the shared value again.
 */
const GlobalPropertyOverride: FunctionComponent<{
    stepName: string;
    workflowExperience: WorkflowExperience;
    /** The step's heading. */
    heading: ReactNode;
    /**
     * The step has controls which are never shared (a frame's position and scale), so they are shown whether or not
     * the step is overridden.
     */
    keepControls?: boolean;
    /** The step's own controls, told whether the shared properties are in charge of the step. */
    children: (shared: boolean) => ReactNode;
}> = ({ stepName, workflowExperience, heading, keepControls = false, children }) => {
    const bundle = useBundle();
    const activation = useActivation();
    // Overriding means something once the customer is given the shared page to set the values on.
    const sharedPageShown = usePageEnabled("shared-personalise") && !!activation.globalPropertyConfiguration;
    const step = workflowExperience.getStepById(stepName);
    const configuration = bundle.getGlobalPropertyConfiguration();

    // The shared properties this step uses, by the kind of property: the override is per kind.
    const sharedByType = useMemo(() => {
        const result = new Map<AspectType, string[]>();
        if (!sharedPageShown || !step || !configuration) return result;
        for (const name of step.getGlobalPropertyAspects(configuration.id)) {
            const aspect = configuration.aspects.find((candidate) => candidate.name === name);
            if (!aspect || aspect.silent) continue;
            result.set(aspect.type, [...(result.get(aspect.type) ?? []), aspect.title || name]);
        }
        return result;
    }, [configuration, sharedPageShown, step]);

    // The step is overridden as a whole, covering every kind of shared property it uses.
    const [overridden, setOverridden] = useState(() =>
        [...sharedByType.keys()].some((type) => !!step?.getOverrideGlobalPropertyConfiguration(type)),
    );
    const [busy, setBusy] = useState(false);

    const setOverride = useCallback(
        async (value: boolean) => {
            if (!step || !configuration) return;
            setBusy(true);
            try {
                const types = [...sharedByType.keys()];
                types.forEach((type) => step.setOverrideGlobalPropertyConfiguration(type, value));
                if (value) setOverridden(true);
                else {
                    // Back to the shared values, which were not being applied to this step while it was overridden.
                    const names = step.getGlobalPropertyAspects(configuration.id);
                    const handles = await bundle.getGlobalProperties();
                    await Promise.all(
                        handles
                            .filter((handle) => types.includes(handle.getType()) && names.includes(handle.getName()))
                            .map((handle) => handle.applyGlobalState([workflowExperience])),
                    );
                    setOverridden(false);
                }
            } catch (error) {
                console.error("Error changing the shared override:", error);
            } finally {
                setBusy(false);
            }
        },
        [bundle, configuration, sharedByType, step, workflowExperience],
    );

    if (sharedByType.size === 0) {
        return (
            <>
                {heading}
                {children(false)}
            </>
        );
    }

    return (
        <Wrapper>
            {heading}
            {overridden ? (
                <>
                    <RevertSlot>
                        <SmallButton
                            disabled={busy}
                            icon={<RotateCcw size={14} aria-hidden="true" />}
                            onClick={() => setOverride(false)}
                        >
                            Use shared
                        </SmallButton>
                    </RevertSlot>
                    {children(false)}
                </>
            ) : (
                <>
                    <Notice>
                        <NoticeText>
                            This is set for every product on the shared page (
                            {[...sharedByType.values()].flat().join(", ")}
                            ).
                        </NoticeText>
                        <SmallButton
                            disabled={busy}
                            icon={<SlidersHorizontal size={14} aria-hidden="true" />}
                            onClick={() => setOverride(true)}
                        >
                            Customise for this product
                        </SmallButton>
                    </Notice>
                    {keepControls && children(true)}
                </>
            )}
        </Wrapper>
    );
};

export default GlobalPropertyOverride;
