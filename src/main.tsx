import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import Intro from "./components/Intro";
import { enableTilt } from "./lib/tilt";
import { wakeAi } from "./lib/useAiOnline";
import "./styles.css";

wakeAi();
enableTilt();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Intro />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
