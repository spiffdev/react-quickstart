import { FunctionComponent, ReactNode } from "react";
import styled from "styled-components";
import LoadingOverlay from "./LoadingOverlay";
import useDebounce from "../../hooks/useDebounce";

const Wrapper = styled.div`
    position: relative;
    height: 100%;
`;

const Container = styled.div`
    height: 100%;
    overflow: auto;
`;

const Grid = styled.div`
    padding: 30px;
    display: flex;
    flex-direction: row;
    gap: 10px;
    flex-wrap: wrap;
`;

const SelectorContainer: FunctionComponent<{ children: ReactNode; loading?: boolean }> = ({
    children,
    loading = false,
}) => {
    const debouncedLoading = useDebounce(loading, 5);

    return (
        <Wrapper>
            {debouncedLoading && <LoadingOverlay />}
            <Container>
                <Grid>{children}</Grid>
            </Container>
        </Wrapper>
    );
};

export default SelectorContainer;
