import { defineConfig, splitVendorChunkPlugin } from "vite";
import svgr from "vite-plugin-svgr";
import { spiffThemePlugin } from "@spiffcommerce/theme-bridge";
import { configurationSchema } from "./src/configurationSchema";
import { existsSync, readFileSync } from "fs";

// https://vitejs.dev/config/
export default defineConfig((env) => {
    const configurationPath = `./.env.${env.mode}.json`;
    const themeConfiguration = existsSync(configurationPath) ? readFileSync(configurationPath, "utf-8") : undefined;
    return {
        base: "",
        define: {
            __LOCAL_DEV_CONFIGURATION__: themeConfiguration,
            "globalThis.__DEV__": JSON.stringify(false),
        },
        plugins: [
            svgr(),
            splitVendorChunkPlugin(),
            spiffThemePlugin({ configurationSchema, includePreloadChunks: false }),
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
                        if (id.includes("@spiffcommerce/preview")) return "vendor-spiffcommerce-preview";
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
