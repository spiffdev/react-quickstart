import { FunctionComponent } from "react";
import Button from "../button";
import Card from "../card";
import Typography from "../typography";

const SelectorTile: FunctionComponent<{
    imageUrl: string | undefined;
    title: string;
    onClick: () => void;
}> = ({ imageUrl, title, onClick }) => {
    return (
        <Card>
            {imageUrl ? <img src={imageUrl} width="150px" /> : undefined}
            <Typography>{title}</Typography>
            <Button onClick={() => onClick()}>
                <Typography>Select</Typography>
            </Button>
        </Card>
    );
};

export default SelectorTile;
