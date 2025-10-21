import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    // Use VITE_GOOGLE_CLIENT_ID from environment variables
    // Falls back to undefined if not set (dev mode will handle this gracefully)
    const finalClientId = env.VITE_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;

    // Define environment variables for client-side bundle
    const clientEnvDefine = {
        'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(finalClientId),
        'import.meta.env.MODE': JSON.stringify(mode),
    };

    return {
        define: clientEnvDefine,

        plugins: [
            react(),
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
