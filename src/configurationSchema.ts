import { FieldType, ThemeConfigurationSchema } from "@spiffcommerce/theme-bridge";

// TODO: fill these out with stuff like colors and fonts for basic configuration.

export interface ThemeConfiguration {
    /**
     * Lets customers upload an image from their phone by scanning a QR code.
     */
    enableMobileUpload?: boolean;
    /**
     * Width of the scenes sidebar, as a percentage of the window.
     */
    sidebarWidthPercentage?: number;
}

export const configurationSchema: ThemeConfigurationSchema = {
    fields: [
        {
            type: FieldType.Boolean,
            key: "enableMobileUpload",
            title: "Enable Mobile Upload",
            defaultValue: "false",
            description: "When true, allows users to upload images from their mobile device using a QR code.",
        },
        {
            type: FieldType.Number,
            key: "sidebarWidthPercentage",
            title: "Sidebar Width (Percentage)",
            defaultValue: "25",
            description: "Width of the scenes sidebar, as a percentage of the window.",
        },
    ],
};

// TODO: pages example
