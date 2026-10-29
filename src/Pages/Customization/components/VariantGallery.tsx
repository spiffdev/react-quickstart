import { FunctionComponent, useMemo, useState } from "react";
import { Variant } from "@spiffcommerce/core";
import styled from "styled-components";
import Typography from "../../../components/typography";
import useVariantPrice from "../../../hooks/usePricing";

const Filters = styled.div`
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
`;

const FilterInput = styled.input`
    flex: 1 1 0;
    min-width: 0;
    padding: 8px 12px;
    font-size: 14px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: #007bff;
    }
`;

const FilterSelect = styled.select`
    flex: 1 1 0;
    min-width: 0;
    padding: 8px 12px;
    font-size: 14px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: white;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: #007bff;
    }
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    width: 100%;
`;

const Card = styled.div<{ $selected?: boolean; $disabled?: boolean }>`
    position: relative;
    aspect-ratio: 1;
    border: 2px solid ${(props) => (props.$selected ? "#007bff" : "#e0e0e0")};
    border-radius: 8px;
    cursor: ${(props) => (props.$disabled ? "not-allowed" : "pointer")};
    overflow: hidden;
    transition: all 0.2s;
    opacity: ${(props) => (props.$disabled ? 0.5 : 1)};

    &:hover {
        border-color: ${(props) => (props.$disabled ? "#e0e0e0" : "#007bff")};
        transform: ${(props) => (props.$disabled ? "none" : "translateY(-2px)")};
        box-shadow: ${(props) => (props.$disabled ? "none" : "0 4px 8px rgba(0, 0, 0, 0.1)")};
    }
`;

const CardImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

const CardPrice = styled.span`
    display: block;
    font-size: 11px;
    opacity: 0.8;
`;

const CardName = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 12px;
    text-align: center;
`;

const EmptyText = styled(Typography)`
    margin: 8px 0;
    font-size: 14px;
    color: #666;
`;

const VariantGallery: FunctionComponent<{
    variants: Variant[];
    selectedVariantId?: string;
    disabled?: boolean;
    searchEnabled?: boolean;
    categoriesEnabled?: boolean;
    onSelect: (variant: Variant) => void;
}> = ({ variants, selectedVariantId, disabled, searchEnabled, categoriesEnabled, onSelect }) => {
    const getVariantPrice = useVariantPrice();
    const [query, setQuery] = useState("");
    // Start on the selected variant's category, as Beeline does.
    const [category, setCategory] = useState(
        () => variants.find((variant) => variant.getId() === selectedVariantId)?.getCategory() ?? "",
    );

    const categories = useMemo(
        () => Array.from(new Set(variants.map((variant) => variant.getCategory()).filter((c): c is string => !!c))),
        [variants],
    );
    const showCategories = !!categoriesEnabled && categories.length > 0;

    const filteredVariants = useMemo(() => {
        const search = query.trim().toLowerCase();
        return variants.filter((variant) => {
            const matchesCategory = !showCategories || category === "" || variant.getCategory() === category;
            const matchesSearch =
                !searchEnabled ||
                search === "" ||
                variant.getName().toLowerCase().includes(search) ||
                !!variant.getAssetResource()?.name?.toLowerCase().includes(search);
            return matchesCategory && matchesSearch;
        });
    }, [category, query, searchEnabled, showCategories, variants]);

    return (
        <>
            {(searchEnabled || showCategories) && (
                <Filters>
                    {showCategories && (
                        <FilterSelect value={category} onChange={(event) => setCategory(event.target.value)}>
                            <option value="">All categories</option>
                            {categories.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </FilterSelect>
                    )}
                    {searchEnabled && (
                        <FilterInput
                            type="search"
                            value={query}
                            placeholder="Search..."
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    )}
                </Filters>
            )}
            {filteredVariants.length === 0 ? (
                <EmptyText variant="p">No results found.</EmptyText>
            ) : (
                <Grid>
                    {filteredVariants.map((variant) => {
                        const price = getVariantPrice(variant);
                        return (
                            <Card
                                key={variant.getId()}
                                $selected={selectedVariantId === variant.getId()}
                                $disabled={disabled || !variant.isEnabled()}
                                onClick={() => !disabled && variant.isEnabled() && onSelect(variant)}
                            >
                                {variant.getThumbnail() && (
                                    <CardImage src={variant.getThumbnail()} alt={variant.getName()} />
                                )}
                                <CardName>
                                    {variant.getName()}
                                    {price && <CardPrice>{price}</CardPrice>}
                                </CardName>
                            </Card>
                        );
                    })}
                </Grid>
            )}
        </>
    );
};

export default VariantGallery;
