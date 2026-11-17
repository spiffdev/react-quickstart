import styled, { keyframes } from "styled-components";
import { MEDIA } from "../layout";

const slideIn = keyframes`
    from {
        transform: translateX(32px);
        opacity: 0;
    }

    to {
        transform: none;
        opacity: 1;
    }
`;

/** Covers the experience, with the panel on its right. */
export const Backdrop = styled.div`
    position: absolute;
    inset: 0;
    z-index: 10000; /* Above the loading overlay (9999) */
    display: flex;
    align-items: stretch;
    justify-content: flex-end;
    background: rgba(0, 0, 0, 0.5);
`;

/**
 * The portal's panel. A sidebar on larger screens, so the experience stays in view beside it, and the whole view on
 * phones, where there's no room for both.
 */
export const Dialog = styled.div`
    width: 100%;
    max-width: 480px;
    height: 100%;
    overflow-y: auto;
    padding: 24px;
    background: #ffffff;
    box-sizing: border-box;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.25);
    animation: ${slideIn} 0.2s ease-out;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }

    @media ${MEDIA.compact} {
        max-width: none;
        padding: 16px;
        box-shadow: none;
    }
`;

export const Header = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
`;

export const Title = styled.h2`
    margin: 0;
    font-size: 18px;
`;

export const Muted = styled.p`
    margin: 8px 0 16px;
    font-size: 14px;
    color: #616161;
`;

export const Input = styled.input`
    width: 100%;
    box-sizing: border-box;
    margin-bottom: 12px;
    padding: 10px 12px;
    font: inherit;
    border: 1px solid #bdbdbd;
    border-radius: 5px;
`;

export const TextButton = styled.button`
    padding: 0;
    font: inherit;
    font-size: 14px;
    color: var(--theme-primary-color);
    background: none;
    border: none;
    cursor: pointer;

    &:hover:not(:disabled) {
        text-decoration: underline;
    }

    &:disabled {
        color: #9e9e9e;
        cursor: default;
    }
`;

export const MenuItem = styled.button`
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    margin-top: 8px;
    padding: 12px 16px;
    font: inherit;
    text-align: left;
    background: #f7f7f7;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    cursor: pointer;

    & > span {
        font-size: 13px;
        color: #616161;
    }

    &:hover:not(:disabled) {
        border-color: var(--theme-primary-color);
    }

    &:disabled {
        cursor: default;
        opacity: 0.6;
    }
`;

export const Row = styled.li`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #eeeeee;
`;

export const RowText = styled.div`
    min-width: 0;
    font-size: 14px;

    & > strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    & > span {
        color: #616161;
    }
`;

export const List = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
`;

export const Chips = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
`;

export const Chip = styled.span`
    padding: 2px 8px;
    font-size: 12px;
    color: #424242;
    background: #eeeeee;
    border-radius: 10px;
`;

export const Thumbnail = styled.img`
    flex: none;
    width: 48px;
    height: 48px;
    object-fit: cover;
    border-radius: 6px;
    background: #f0f0f0;
`;
