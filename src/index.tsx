import "./reset.css";
import "./index.css"; // Ensure this is at top of file so its css data is imported before all others
import { type SpiffThemeLoader } from "@spiffcommerce/theme-bridge";
import { createRoot } from "react-dom/client";
import App from "./App";

if (import.meta.env.DEV) {
    // this would break if not dynamic, since the package is only a dev dependency
    const { startSpiffDevelopment } = await import("@spiffcommerce/theme-bridge");
    // Loads the configuration (from the local .env.<mode>.jsonc/.json overrides, or Spiff Commerce), resolves the
    // activation or bundle from the VITE_* variables, and sets up window.SpiffThemeLoader.
    await startSpiffDevelopment({
        env: import.meta.env,
        // Imported lazily as the schema needs theme-bridge at runtime, which is only available during development.
        schema: () => import("./configurationSchema"),
    });
}

const spiffThemeLoader = (window as any).SpiffThemeLoader as SpiffThemeLoader;
const context = await spiffThemeLoader.getContext();
createRoot(context.container).render(<App context={context} />);
