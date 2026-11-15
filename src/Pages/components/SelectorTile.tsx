import { FunctionComponent } from "react";
import { MEDIA } from "../../layout";
import styled from "styled-components";
import Button from "../../components/button";
import DropdownButton, { type DropdownItem } from "../../components/DropdownButton";
import Card from "../../components/card";
import Typography from "../../components/typography";
import LoadingSpinner from "./LoadingSpinner";

const TileCard = styled(Card)<{ $selected?: boolean }>`
    width: 250px;
    height: 400px;
    max-width: 100%;

    @media ${MEDIA.compact} {
        width: 100%;
        height: 320px;
    }
    ${(props) => props.$selected && "border-color: var(--theme-primary-color); box-shadow: var(--theme-primary-color) 0px 0px 4px 1px;"}
`;

const ImageContainer = styled.div`
    flex-grow: 1;
    width: 100%;
    min-height: 0;
    overflow: hidden;
`;

const TileImage = styled.img`
    object-fit: contain;
    width: 100%;
    height: 100%;
`;

const Pending = styled(Typography)`
    display: inline-flex;
    align-items: center;
    gap: 8px;
`;

const SelectorTile: FunctionComponent<{
    imageUrl?: string;
    title: string;
    /** Marks the choice the customer already made, when they come back to this page. */
    selected?: boolean;
    onClick: () => void;
    /**
     * When there is more than one choice, the button offers them in a menu and calls `onChoose` instead of `onClick`.
     */
    choices?: DropdownItem[];
    onChoose?: (id: string) => void;
    /** How many requests from this tile are waiting or in progress. The button stays usable, so more can be queued. */
    pending?: number;
}> = ({ imageUrl, title, selected, onClick, choices, onChoose, pending = 0 }) => {
    const label =
        pending > 0 ? (
            <Pending variant="span" role="status">
                <LoadingSpinner size={14} thickness={2} color="var(--theme-primary-contrast-color)" />
                {pending > 1 ? `Adding (${pending})...` : "Adding..."}
            </Pending>
        ) : (
            <Typography>{selected ? "Selected" : "Select"}</Typography>
        );
    return (
        <TileCard $selected={selected}>
            <ImageContainer>{imageUrl ? <TileImage src={imageUrl} /> : undefined}</ImageContainer>
            <Typography>{title}</Typography>
            {choices && choices.length > 1 && onChoose ? (
                <DropdownButton label={label} items={choices} onSelect={onChoose} />
            ) : (
                <Button onClick={() => onClick()}>{label}</Button>
            )}
        </TileCard>
    );
};

export default SelectorTile;
