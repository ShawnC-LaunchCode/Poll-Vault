import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { suppressGoogleOAuthWarnings } from "./lib/suppressGoogleOAuthWarnings";

// Suppress harmless Google OAuth COOP warnings
suppressGoogleOAuthWarnings();

createRoot(document.getElementById("root")!).render(<App />);
