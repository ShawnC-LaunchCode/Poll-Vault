import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// =======================================================================
// 💡 TEMPORARY FIX: HARDCODE THE CLIENT ID
// This bypasses the failing Docker/Railway variable injection mechanism.
// TODO: Move to proper environment variable injection
const GOOGLE_CLIENT_ID_STRING = "853635559991-m8u2032kghq3nhcgaak27dpnh1uru4tu.apps.googleusercontent.com";
// =======================================================================

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    // Use hardcoded client ID for now
    const finalClientId = GOOGLE_CLIENT_ID_STRING;

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
