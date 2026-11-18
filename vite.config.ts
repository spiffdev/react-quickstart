import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
// @ts-expect-error - spiffThemePlugin export may not be in type definitions yet
import { spiffThemePlugin } from "@spiffcommerce/theme-bridge/plugin";
import { configurationSchema, pageSettings } from "./src/configurationSchema";

// https://vitejs.dev/config/
export default defineConfig(() => {
    return {
        base: "",
        define: {
            "globalThis.__DEV__": JSON.stringify(false),
        },
        plugins: [
            svgr(),
            // Also loads the local configuration (.env.<mode>.jsonc, or failing that .env.<mode>.json) into
            // __LOCAL_DEV_CONFIGURATION__, and restarts the dev server when it changes.
            spiffThemePlugin({ configurationSchema, pageSettings, includePreloadChunks: false }),
        ],
        build: {
            emptyOutDir: true,
            rollupOptions: {
                output: {
                    entryFileNames: "assets/[name].js",
                    chunkFileNames: "assets/[name].chunk.js",
                    assetFileNames: "assets/[name].[ext]",
                    manualChunks(id, _meta) {
                        if (!id.includes("node_modules")) return;
                        if (id.includes("@spiffcommerce/preview-3d")) return "vendor-spiffcommerce-preview-3d";
                        if (id.includes("@spiffcommerce")) return "vendor-spiffcommerce";
                        return;
                    },
                },
            },
        },
        server: {
            port: 3333,
        },
        preview: {
            port: 3334,
        },
    };
});
