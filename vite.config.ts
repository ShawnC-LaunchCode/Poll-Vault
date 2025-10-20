import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Define a placeholder for the plugins that require dynamic import to avoid 
// breaking the defineConfig function structure. 
// We use 'await import' outside of the export default function.
const cartographer = import("@replit/vite-plugin-cartographer").then((m) => m.cartographer());
const devBanner = import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner());

// Use a simple array for the conditional plugins
const conditionalPlugins = (async () => {
    if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
        return [await cartographer, await devBanner];
    }
    return [];
})();


// Use defineConfig with a function to ensure we get the correct mode,
// and implement the explicit environment variable injection fix.
export default defineConfig(async ({ mode }) => {
    
    // 1. Explicitly load environment variables. 
    // This attempts to pick up local .env files, but the shell's variables (from Railway)
    // take precedence, which is what we want.
    const env = loadEnv(mode, process.cwd(), '');

    // 2. Determine the final client ID value:
    //    - First, check the value loaded by Vite's loadEnv helper (which checks the shell).
    //    - Second, use a fallback to directly check the Node environment (process.env) 
    //      as a redundant safety measure.
    const googleClientId = env.VITE_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;

    // 3. Define the explicit replacement for the client-side bundle.
    // The value MUST be stringified to be baked into the client JS code.
    const clientEnvDefine = {
        'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(googleClientId),
        // 💡 OPTIONAL: You can also explicitly define the MODE here to silence the
        // "running in development mode" warning if you are certain you are building for production.
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
            // Your build configuration is correct: it relies on the 'root' setting above
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