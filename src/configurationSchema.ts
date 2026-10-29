import { FieldType, ThemeConfigurationSchema } from "@spiffcommerce/theme-bridge";

// TODO: fill these out with stuff like colors and fonts for basic configuration.

export interface ThemeConfiguration {
    /**
     * Lets customers upload an image from their phone by scanning a QR code.
     */
    enableMobileUpload?: boolean;
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
    ],
};

// TODO: pages example
