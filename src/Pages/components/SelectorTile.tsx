import { FunctionComponent } from "react";
import styled from "styled-components";
import Button from "../../components/button";
import Card from "../../components/card";
import Typography from "../../components/typography";

const TileCard = styled(Card)`
    width: 250px;
    height: 400px;
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
    onClick: () => void;
}> = ({ imageUrl, title, onClick }) => {
    return (
        <TileCard>
            <ImageContainer>{imageUrl ? <TileImage src={imageUrl} /> : undefined}</ImageContainer>
            <Typography>{title}</Typography>
            <Button onClick={() => onClick()}>
                <Typography>Select</Typography>
            </Button>
        </TileCard>
    );
};

export default SelectorTile;
