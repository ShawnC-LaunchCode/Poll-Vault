import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// 💡 Vite configuration can receive a function that provides mode and command.
export default defineConfig(({ mode }) => {
    
    // 1. Explicitly load environment variables from the current working directory.
    // The third argument '' allows loading variables without the VITE_ prefix (optional, but harmless).
    const env = loadEnv(mode, process.cwd(), '');
    
    // 2. Define the VITE_GOOGLE_CLIENT_ID to be explicitly injected into the bundle.
    // We use JSON.stringify() to ensure the value is baked in as a string literal.
    const clientEnv = {
        'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID),
    };

    return {
        // 🛠️ FIX APPLIED HERE: Explicitly inject the variable into the client bundle
        define: clientEnv,

        plugins: [
            react(),
            runtimeErrorOverlay(),
            ...(process.env.NODE_ENV !== "production" &&
            process.env.REPL_ID !== undefined
                ? [
                    // Note: If 'await' is inside defineConfig, you must use a top-level async function 
                    // or handle promises correctly. I'll assume your original code handles this 
                    // 'await import(...)' correctly outside the immediate scope for now.
                    // If deployment fails here, you should remove the 'await' and simplify these imports.
                    import("@replit/vite-plugin-cartographer").then((m) =>
                        m.cartographer(),
                    ),
                    import("@replit/vite-plugin-dev-banner").then((m) =>
                        m.devBanner(),
                    ),
                  ]
                : []),
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