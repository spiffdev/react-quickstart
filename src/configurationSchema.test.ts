import { FieldType } from "@spiffcommerce/theme-bridge";
import { configurationSchema, pageSettings } from "./configurationSchema";
import { getMergedPageSettings } from "./hooks/useThemeConfiguration";

// Headings have no key, as nothing is stored for them.
const fieldKeys = configurationSchema.fields.flatMap((field) => ("key" in field ? [field.key] : []));

describe("configurationSchema", () => {
    it("has a unique key for every field", () => {
        expect(new Set(fieldKeys).size).toBe(fieldKeys.length);
    });

    it("only has Select fields which offer options with a default among them", () => {
        for (const field of configurationSchema.fields) {
            if (field.type !== FieldType.Select) continue;
            expect(field.options.length, field.key).toBeGreaterThan(0);
            if ("defaultValue" in field && field.defaultValue) {
                expect(
                    field.options.map((option) => option.key),
                    field.key,
                ).toContain(field.defaultValue);
            }
        }
    });

    it("keeps the user portal's order details off by default", () => {
        for (const key of ["portalOrderName", "portalPurchaseOrder", "portalDispatchDate"]) {
            const field = configurationSchema.fields.find((candidate) => "key" in candidate && candidate.key === key);
            expect(field?.type).toBe(FieldType.Select);
            expect(field && "defaultValue" in field ? field.defaultValue : undefined).toBe("off");
        }
    });
});

describe("pageSettings", () => {
    const pageKeys = pageSettings.pages.map((page) => page.key);

    it("has a unique key for every page", () => {
        expect(new Set(pageKeys).size).toBe(pageKeys.length);
    });

    it("puts every page in exactly one group, and every group only lists real pages", () => {
        const listed = pageSettings.groups.flatMap((group) => group.pageKeys);
        expect([...listed].sort()).toEqual([...pageKeys].sort());
    });

    it("only configures fields which exist, and each at most once", () => {
        const used = pageSettings.pages.flatMap((page) => page.sections.flatMap((section) => section.fields));
        for (const key of used) expect(fieldKeys, key).toContain(key);
        expect(new Set(used).size).toBe(used.length);
    });

    describe("the welcome page", () => {
        const welcome = pageSettings.pages.find((page) => page.key === "welcome");

        it("is off until it is switched on, and can be", () => {
            expect(welcome?.toggleable).toBe(true);
            expect(welcome?.disabled).toBe(true);
        });

        it("is in a group of its own which can't be reordered, so it always comes first", () => {
            const group = pageSettings.groups.find((candidate) => candidate.pageKeys.includes("welcome"));
            expect(group?.pageKeys).toEqual(["welcome"]);
            expect(group?.reorderable).toBe(false);
            const order = pageSettings.groups.map((candidate) => candidate.key);
            expect(order.indexOf("welcome")).toBeLessThan(order.indexOf("personalization"));
            expect(order.indexOf("welcome")).toBeLessThan(order.indexOf("journey"));
        });
    });
});

describe("getMergedPageSettings", () => {
    const withInstalled = (installed: unknown) => ({ pageSettings: installed, themeVersion: {} }) as never;

    it("uses the theme's own settings when the partner hasn't changed any", () => {
        expect(getMergedPageSettings(undefined)).toBe(pageSettings);
    });

    it("switches a page on when the partner enables it", () => {
        const merged = getMergedPageSettings(withInstalled({ pages: [{ key: "welcome", enabled: true }] }));
        expect(merged.pages.find((page) => page.key === "welcome")?.disabled).toBe(false);
        expect(merged.pages.find((page) => page.key === "review")?.disabled).toBe(true);
    });

    it("keeps a page's default when the platform sends null for it", () => {
        const merged = getMergedPageSettings(withInstalled({ pages: [{ key: "welcome", enabled: null }] }));
        expect(merged.pages.find((page) => page.key === "welcome")?.disabled).toBe(true);
    });

    it("applies the partner's order to the personalise pages", () => {
        const merged = getMergedPageSettings(
            withInstalled({ groups: [{ key: "personalization", pageOrder: ["personalize", "shared-personalize"] }] }),
        );
        expect(merged.groups.find((group) => group.key === "personalization")?.pageKeys).toEqual([
            "personalize",
            "shared-personalize",
        ]);
    });
});
