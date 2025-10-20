import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// =======================================================================
// 💡 FINAL FIX: HARDCODE THE CLIENT ID
// This bypasses the failing Docker/Railway variable injection mechanism.
// YOU MUST REPLACE THE STRING BELOW WITH YOUR ACTUAL CLIENT ID.
const GOOGLE_CLIENT_ID_STRING = "853635559991-m8u2032kghq3nhcgaak27dpnh1uru4tu.apps.googleusercontent.com";
// =======================================================================

// Define a placeholder for the plugins that require dynamic import to avoid 
// breaking the defineConfig function structure. 
const cartographer = import("@replit/vite-plugin-cartographer").then((m) => m.cartographer());
const devBanner = import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner());

// Use a simple array for the conditional plugins
const conditionalPlugins = (async () => {
    if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
        // These are imported asynchronously to match your original pattern
        return [await cartographer, await devBanner];
    }
    return [];
})();


// Use defineConfig with an async function (as you defined it)
export default defineConfig(async ({ mode }) => {
    
    // loadEnv is now redundant for the Client ID but kept for MODE/other variables
    const env = loadEnv(mode, process.cwd(), '');

    // 1. Determine the final client ID value:
    // We prioritize the hardcoded string over the potentially blank value from env.
    const finalClientId = GOOGLE_CLIENT_ID_STRING;

    // 2. Define the explicit replacement for the client-side bundle.
    // The value MUST be stringified to be baked into the client JS code.
    const clientEnvDefine = {
        // This forces the hardcoded string into the client bundle at build time.
        'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(finalClientId),
        
        // This ensures the mode is correctly set for other logic
        'import.meta.env.MODE': JSON.stringify(mode),
    };

    return {
        // FIX APPLIED HERE:
        define: clientEnvDefine,
        
        plugins: [
            react(),
            runtimeErrorOverlay(),
            // Await the conditional plugins array and spread it
            ...(await conditionalPlugins),
        ],
        resolve: {
            alias: {
                "@": path.resolve(import.meta.dirname, "client", "src"),
                "@shared": path.resolve(import.meta.dirname, "shared"),
                "@assets": path.resolve(import.meta.dirname, "attached_assets"),
            },
        },
        root: path.resolve(import.meta.dirname, "client"),
        build: {
            outDir: path.resolve(import.meta.dirname, "dist/public"),
            emptyOutDir: true,
        },
        server: {
            fs: {
                strict: true,
                deny: ["**/.*"],
            },
        },
    };
});
