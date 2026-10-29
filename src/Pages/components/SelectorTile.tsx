import { FunctionComponent } from "react";
import styled from "styled-components";
import Button from "../../components/button";
import Card from "../../components/card";
import Typography from "../../components/typography";

const TileCard = styled(Card)<{ $selected?: boolean }>`
    width: 250px;
    height: 400px;
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

const SelectorTile: FunctionComponent<{
    imageUrl?: string;
    title: string;
    /** Marks the choice the customer already made, when they come back to this page. */
    selected?: boolean;
    onClick: () => void;
}> = ({ imageUrl, title, selected, onClick }) => {
    return (
        <TileCard $selected={selected}>
            <ImageContainer>{imageUrl ? <TileImage src={imageUrl} /> : undefined}</ImageContainer>
            <Typography>{title}</Typography>
            <Button onClick={() => onClick()}>
                <Typography>{selected ? "Selected" : "Select"}</Typography>
            </Button>
        </TileCard>
    );
};

export default SelectorTile;
