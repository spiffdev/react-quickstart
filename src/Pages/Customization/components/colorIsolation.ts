const SVG_NS = "http://www.w3.org/2000/svg";
const BASE64_SVG_PREFIX = "data:image/svg";

export interface ActiveColorIds {
    selected: string[];
    hovered: string[];
}

const DIM_FILTER_ID = "dim-filter";
const HIGHLIGHT_FILTER_ID = "highlight-filter";
const SELECTED_FILTER_ID = "selected-filter";

const createElement = (
    doc: Document,
    name: string,
    attributes: Record<string, string> = {},
    children: Element[] = [],
) => {
    const element = doc.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    children.forEach((child) => element.appendChild(child));
    return element;
};

const filterBounds = { x: "-50%", y: "-50%", width: "200%", height: "200%" };

const createDimFilter = (doc: Document) =>
    createElement(doc, "filter", { id: DIM_FILTER_ID, ...filterBounds }, [
        createElement(doc, "feColorMatrix", { type: "saturate", values: "0" }),
        createElement(doc, "feGaussianBlur", { stdDeviation: "2" }),
        createElement(doc, "feComponentTransfer", {}, [
            createElement(doc, "feFuncA", { type: "linear", slope: "0.3" }),
        ]),
    ]);

const createGlowFilter = (doc: Document, id: string, blur: string, offsetY: string, opacity: string) =>
    createElement(doc, "filter", { id, ...filterBounds }, [
        createElement(doc, "feGaussianBlur", { in: "SourceAlpha", stdDeviation: blur }),
        createElement(doc, "feOffset", { dx: "0", dy: offsetY, result: "offsetblur" }),
        createElement(doc, "feFlood", { "flood-color": "currentColor", "flood-opacity": opacity }),
        createElement(doc, "feComposite", { in2: "offsetblur", operator: "in" }),
        createElement(doc, "feMerge", {}, [
            createElement(doc, "feMergeNode"),
            createElement(doc, "feMergeNode", { in: "SourceGraphic" }),
        ]),
    ]);

const colorIdOf = (element: Element) =>
    Array.from(element.classList)
        .find((className) => className.startsWith("spiff-fill-") || className.startsWith("spiff-stroke-"))
        ?.replace(/spiff-(fill|stroke)-/, "");

const decodeBase64 = (base64: string) =>
    new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));

/**
 * Returns an image source in which the selected and hovered colors stand out and every other color is dimmed.
 * Anything that isn't a base64 SVG data URI (e.g. a raster image) is returned untouched.
 */
export const isolateColors = (imageSrc: string, activeColorIds: ActiveColorIds): string => {
    const { selected, hovered } = activeColorIds;
    if ((!selected.length && !hovered.length) || !imageSrc.startsWith(BASE64_SVG_PREFIX)) {
        return imageSrc;
    }

    try {
        const doc = new DOMParser().parseFromString(decodeBase64(imageSrc.split(",")[1]), "image/svg+xml");
        const svgRoot = doc.documentElement;

        let defs: Element | null = svgRoot.querySelector("defs");
        if (!defs) {
            defs = createElement(doc, "defs");
            svgRoot.insertBefore(defs, svgRoot.firstChild);
        }
        defs.append(
            createDimFilter(doc),
            createGlowFilter(doc, HIGHLIGHT_FILTER_ID, "2", "0", "0.25"),
            createGlowFilter(doc, SELECTED_FILTER_ID, "3", "1", "0.35"),
        );

        svgRoot.querySelectorAll('[class*="spiff-fill-"], [class*="spiff-stroke-"]').forEach((element) => {
            const colorId = colorIdOf(element);
            if (!colorId) {
                element.removeAttribute("filter");
            } else if (selected.includes(colorId)) {
                element.setAttribute("filter", `url(#${SELECTED_FILTER_ID})`);
            } else if (hovered.includes(colorId)) {
                element.setAttribute("filter", `url(#${HIGHLIGHT_FILTER_ID})`);
            } else {
                element.setAttribute("filter", `url(#${DIM_FILTER_ID})`);
            }
        });

        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svgRoot))}`;
    } catch (error) {
        console.error("Failed to isolate colors in the image:", error);
        return imageSrc;
    }
};
