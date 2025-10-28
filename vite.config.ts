import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
                "@": path.resolve(__dirname, "client", "src"),
                "@shared": path.resolve(__dirname, "shared"),
                "@assets": path.resolve(__dirname, "attached_assets"),
            },
        },
        root: path.resolve(__dirname, "client"),
        build: {
            outDir: path.resolve(__dirname, "dist/public"),
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
