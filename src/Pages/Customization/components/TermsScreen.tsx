import { FunctionComponent } from "react";
import ReactMarkdown from "react-markdown";
import styled from "styled-components";
import Button from "../../../components/button";
import Typography from "../../../components/typography";

const Panel = styled.div<{ $visible: boolean }>`
    position: fixed;
    top: 0;
    right: 0;
    height: 100%;
    width: min(480px, 100%);
    box-sizing: border-box;
    background-color: #fff;
    z-index: 1200;
    display: flex;
    flex-direction: column;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
    transform: translateX(${(props) => (props.$visible ? "0" : "100%")});
    visibility: ${(props) => (props.$visible ? "visible" : "hidden")};
    transition:
        transform 0.3s ease-in-out,
        visibility 0.3s;
`;

const Header = styled.div`
    padding: 20px;
    background-color: #eee;
    border-bottom: 1px solid #e0e0e0;
`;

const Body = styled.div`
    flex: 1 1 0;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 20px;
`;

const Footer = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 19px;
    background-color: #eee;
    border-top: 1px solid #e0e0e0;
`;

const TermsScreen: FunctionComponent<{
    visible: boolean;
    source: string;
    onAgree: () => void;
    onBack: () => void;
}> = ({ visible, source, onAgree, onBack }) => {
    return (
        <Panel $visible={visible} aria-hidden={!visible}>
            <Header>
                <Typography variant="h2">Terms and Conditions</Typography>
            </Header>
            <Body>
                <ReactMarkdown>{source}</ReactMarkdown>
            </Body>
            <Footer>
                <Button onClick={onBack}>Back</Button>
                <Button onClick={onAgree}>Agree and checkout</Button>
            </Footer>
        </Panel>
    );
};

export default TermsScreen;
