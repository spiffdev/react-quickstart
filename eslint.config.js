import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReact from "eslint-plugin-react";
import globals from "globals";
import onlyWarn from "eslint-plugin-only-warn";

export default defineConfig([
    js.configs.recommended,
    eslintConfigPrettier,
    ...tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    {
        ignores: ["dist/", "node_modules/", "vite.config.ts", "*.html"],
    },
    {
        files: ["**/*.{ts,tsx,js,jsx}"],
        languageOptions: {
            ...pluginReact.configs.flat.recommended.languageOptions,
            globals: {
                ...globals.serviceworker,
                ...globals.browser,
            },
        },
        plugins: {
            "react-hooks": pluginReactHooks,
            onlyWarn,
        },
        settings: {
            react: { version: "detect" },
        },
        linterOptions: {
            reportUnusedDisableDirectives: false,
        },
        rules: {
            ...pluginReactHooks.configs.recommended.rules,
            "no-control-regex": "off",
            "no-duplicate-imports": "off",
            "no-lonely-if": "off",
            "no-case-declarations": "off",
            "no-spaced-func": "off",
            "object-shorthand": "off",
            "react/prop-types": "off",
            "react/no-unescaped-entities": "off",
            "react/react-in-jsx-scope": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-expressions": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    args: "all",
                    argsIgnorePattern: "^_",
                    caughtErrors: "none",
                    destructuredArrayIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    ignoreRestSiblings: true,
                },
            ],
            "turbo/no-undeclared-env-vars": "off",
        },
    },
]);
