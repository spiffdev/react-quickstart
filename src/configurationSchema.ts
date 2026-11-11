import {
    AssetType,
    type AssetResource,
    type ConversionConfiguration,
    FieldType,
    type ThemeConfigurationPageSettings,
    ThemeConfigurationSchema,
} from "@spiffcommerce/theme-bridge";

export interface ThemeConfiguration {
    /**
     * A custom font used for all text. Falls back to the platform's font.
     */
    font?: AssetResource;
    /**
     * Used for buttons, selections and other highlights.
     */
    primaryColor?: string;
    textColor?: string;
    /**
     * Background of the whole theme. When empty the platform's page background shows through.
     */
    backgroundColor?: string;
    /**
     * Font sizes in pixels.
     */
    sceneHeadingSize?: number;
    stepHeadingSize?: number;
    /**
     * Width of the scenes sidebar, as a percentage of the window.
     */
    sidebarWidthPercentage?: number;
    /**
     * Lets customers upload an image from their device's files. Treated as true when unset. Turn this off for
     * kiosks, where local files are irrelevant. Mobile upload is then always available, whatever enableMobileUpload says.
     */
    enableLocalUpload?: boolean;
    /**
     * Lets customers upload an image from their phone by scanning a QR code.
     */
    enableMobileUpload?: boolean;
    /**
     * Places orders as test bundles, which are excluded from reporting and billing. A warning banner is shown.
     *
     * The platform does allow an application to create orders itself, but this theme only does so for testing.
     * Real orders are handed off to the e-commerce platform's cart instead.
     */
    enableTestOrders?: boolean;
    /**
     * Lets customers request a quote instead of purchasing.
     */
    allowQuoteRequests?: boolean;
    /**
     * Lets customers add their design to the cart and check out.
     */
    allowCartRequests?: boolean;
    /**
     * The details asked of the customer when they request a quote. Only an email is asked for when unset.
     */
    conversionConfiguration?: ConversionConfiguration;
    /**
     * The text of the button that adds the design to the cart.
     */
    addToCartLabel?: string;
    /**
     * The message shown on the thank you page.
     */
    thankYouMessage?: string;
    /**
     * The text of the button that closes the experience from the thank you page.
     */
    thankYouCloseLabel?: string;
}

export const configurationSchema: ThemeConfigurationSchema = {
    fields: [
        {
            type: FieldType.Asset,
            assetType: AssetType.Font,
            key: "font",
            title: "Font",
        },
        {
            type: FieldType.Color,
            key: "primaryColor",
            title: "Primary Colour",
            defaultValue: "#007bff",
            description: "Used for buttons, selections and other highlights.",
        },
        {
            type: FieldType.Color,
            key: "textColor",
            title: "Text Colour",
            defaultValue: "#212121",
        },
        {
            type: FieldType.Color,
            key: "backgroundColor",
            title: "Background Colour",
            description: "Background of the whole theme. Leave empty to use the page's own background.",
        },
        {
            type: FieldType.Number,
            key: "sceneHeadingSize",
            title: "Scene Heading Size (px)",
            defaultValue: "24",
        },
        {
            type: FieldType.Number,
            key: "stepHeadingSize",
            title: "Step Heading Size (px)",
            defaultValue: "18",
        },
        {
            type: FieldType.Number,
            key: "sidebarWidthPercentage",
            title: "Sidebar Width (Percentage)",
            defaultValue: "25",
            description: "Width of the scenes sidebar, as a percentage of the window.",
        },
        {
            type: FieldType.Boolean,
            key: "enableLocalUpload",
            title: "Enable Local Upload",
            defaultValue: "true",
            description:
                "When false, customers can't choose or drag in files from the device. Useful for kiosks. Mobile Upload is then always on, regardless of its own setting.",
        },
        {
            type: FieldType.Boolean,
            key: "enableMobileUpload",
            title: "Enable Mobile Upload",
            defaultValue: "false",
            description: "When true, allows users to upload images from their mobile device using a QR code.",
        },
        {
            type: FieldType.Boolean,
            key: "enableTestOrders",
            title: "Enable Test Orders",
            defaultValue: "false",
            description:
                "When true, orders are placed as test orders and a warning banner is shown. Only use this while testing.",
        },
        {
            type: FieldType.Boolean,
            key: "allowQuoteRequests",
            title: "Allow Quote Requests",
            defaultValue: "false",
            description:
                "When true, the customer will be allowed to enter their details and request a quote instead of purchasing.",
        },
        {
            type: FieldType.Boolean,
            key: "allowCartRequests",
            title: "Allow Cart Requests",
            defaultValue: "true",
            description:
                "When true, the customer will be allowed to add items to their cart and proceed to checkout immediately.",
        },
        {
            type: FieldType.ConversionConfiguration,
            key: "conversionConfiguration",
            title: "Conversion Configuration",
            description: "The details asked of the customer when they request a quote.",
        },
        {
            type: FieldType.Text,
            key: "addToCartLabel",
            title: "Add to Cart Button Text",
            defaultValue: "Complete Design",
            description: "The text shown on the button that adds the design to the cart.",
        },
        {
            type: FieldType.Text,
            key: "thankYouMessage",
            title: "Thank You Message",
            defaultValue: "Your design has been received.",
            description: "The message shown on the thank you page.",
        },
        {
            type: FieldType.Text,
            key: "thankYouCloseLabel",
            title: "Close Button Text",
            defaultValue: "Close",
            description: "The text shown on the thank you page's button that closes the experience.",
        },
    ],
};

// How the configuration fields are organised in the dashboard. Every field listed in a section must exist in the
// schema above, and any field left out of the pages ends up on an auto-generated "Misc" page.
export const pageSettings: ThemeConfigurationPageSettings = {
    groups: [
        {
            key: "appearance",
            title: "Appearance",
            pageKeys: ["styling"],
            reorderable: false,
        },
        {
            key: "journey",
            title: "Customer Journey",
            pageKeys: ["personalise", "review", "thank-you"],
            reorderable: false,
        },
    ],
    pages: [
        {
            key: "styling",
            title: "Styling",
            subtitle: "Colours, fonts and headings applied across the whole experience.",
            icon: "palette",
            toggleable: false,
            sections: [
                {
                    title: "Colours",
                    fields: ["primaryColor", "textColor", "backgroundColor"],
                },
                {
                    title: "Typography",
                    fields: ["font", "sceneHeadingSize", "stepHeadingSize"],
                },
            ],
            // Rendered with Handlebars, so it updates as the configuration changes. Empty values fall back to the
            // same defaults the theme uses.
            previewElement: `
                <div style="font-family: Arial, sans-serif; width: 100%; max-width: 640px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: {{#if backgroundColor}}{{backgroundColor}}{{else}}#ffffff{{/if}}; color: {{#if textColor}}{{textColor}}{{else}}#212121{{/if}};">
                    <!-- Stepper -->
                    <div style="display: flex; align-items: center; gap: 24px; padding: 12px 16px; border-bottom: 1px solid #e0e0e0; font-size: 14px;">
                        <span style="display: flex; align-items: center; gap: 8px;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background-color: {{#if primaryColor}}{{primaryColor}}{{else}}#007bff{{/if}}; color: #ffffff; font-size: 12px;">1</span>
                            Collection
                        </span>
                        <span style="display: flex; align-items: center; gap: 8px; opacity: 0.6;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #bdbdbd; box-sizing: border-box; font-size: 12px;">2</span>
                            Product
                        </span>
                    </div>

                    <div style="padding: 16px;">
                        <h2 style="margin: 0 0 12px 0; font-size: {{#if sceneHeadingSize}}{{sceneHeadingSize}}{{else}}24{{/if}}px;">Personalise</h2>
                        <h3 style="margin: 0 0 8px 0; font-size: {{#if stepHeadingSize}}{{stepHeadingSize}}{{else}}18{{/if}}px;">Choose a product</h3>

                        <!-- Tiles -->
                        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                            {{#each sampleData.products}}
                            <div style="flex: 1; padding: 12px; text-align: center; font-size: 13px; border: 2px solid {{#if ../primaryColor}}{{../primaryColor}}{{else}}#007bff{{/if}}; border-radius: 8px;">{{name}}</div>
                            {{/each}}
                        </div>

                        <button style="padding: 10px 24px; font-size: 14px; color: #ffffff; background-color: {{#if primaryColor}}{{primaryColor}}{{else}}#007bff{{/if}}; border: none; border-radius: 5px;">{{#if addToCartLabel}}{{addToCartLabel}}{{else}}Add to cart{{/if}}</button>
                    </div>
                </div>
            `,
        },
        {
            key: "personalise",
            title: "Personalise",
            subtitle: "How the design editor is laid out and what it offers customers.",
            icon: "sliders",
            toggleable: false,
            sections: [
                {
                    title: "Layout",
                    fields: ["sidebarWidthPercentage"],
                },
                {
                    title: "Uploads",
                    fields: ["enableLocalUpload", "enableMobileUpload"],
                },
                {
                    title: "Checkout",
                    fields: ["addToCartLabel", "allowCartRequests", "allowQuoteRequests", "conversionConfiguration"],
                },
                {
                    title: "Testing",
                    fields: ["enableTestOrders"],
                },
            ],
        },
        {
            key: "review",
            title: "Review",
            subtitle: "A summary of the design, shown after the Personalise page.",
            icon: "sliders",
            // Whether the page is shown is set by the page's toggle, and the page is off until it is switched on.
            toggleable: true,
            disabled: true,
            sections: [],
        },
        {
            key: "thank-you",
            title: "Thank You",
            subtitle: "A closing page, shown once the design has been completed. It doesn't need the review page.",
            icon: "sliders",
            // Whether the page is shown is set by the page's toggle, and the page is off until it is switched on.
            toggleable: true,
            disabled: true,
            sections: [
                {
                    title: "Thank You Page",
                    fields: ["thankYouMessage", "thankYouCloseLabel"],
                },
            ],
        },
    ],
};
