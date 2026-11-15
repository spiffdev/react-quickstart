# React Quickstart

This template gives you everything you need to develop a theme for spiff commerce locally.

# Local Entrypoint

The local entrypoint is `src/index.tsx`. This is the file that Vite will use to start the development server. The file is responsible for rendering the main application component and setting up the theme configuration.

The following env vars are required to run locally.

VITE_APPLICATION_KEY: This is the application key from spiff hub. Please reach out when you're setting up and we'll help you find this.

# Exposing Theme Configuration

Please refer to the file `src/configurationSchema.ts` for reading existing theme configuration and for extending with more.

# Spelling

Code (variables, functions, components, files and directories) uses US spelling, e.g. `color`, `initialized`, `SharedPersonalization`. Text shown to customers and in the dashboard (display names, titles, labels and messages) stays en-GB, e.g. "Colour", "Personalise".

Stored configuration keys, such as the page keys `personalise` and `shared-personalise`, keep their existing spelling, because renaming them would break saved theme configuration.
