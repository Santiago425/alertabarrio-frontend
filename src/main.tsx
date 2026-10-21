import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { activarInclinacion } from "./lib/tilt";
import { despertarIa } from "./lib/useAiOnline";
import "./styles.css";

despertarIa();
activarInclinacion();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
