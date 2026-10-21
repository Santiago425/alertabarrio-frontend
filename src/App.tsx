import { useEffect, useState, type ReactNode } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import AIPage from "./pages/AIPage";
import { Account, Login, Register } from "./pages/Auth";
import Feed, { MyReports } from "./pages/Feed";
import Home from "./pages/Home";
import MapPage from "./pages/MapPage";
import Moderation from "./pages/Moderation";
import NewReport from "./pages/NewReport";
import Notifications from "./pages/Notifications";
import RoutePage from "./pages/RoutePage";
import Structures from "./pages/Structures";
import { CITY_NAME } from "./lib/format";

function Private({ children, moderator = false }: { children: ReactNode; moderator?: boolean }) {
  const { user, loading, isModerator } = useAuth();
  if (loading) return <p className="muted">Cargando…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (moderator && !isModerator) return <p>Esta sección es solo para moderadores.</p>;
  return <>{children}</>;
}

export default function App() {
  const { user, isModerator, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  const initials = user?.full_name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  return (
    <>
      <header className={`topbar ${open ? "open" : ""}`}>
        <NavLink to="/" className="brand">
          <img src="/favicon.svg" alt="" width={30} height={30} />
          <span>
            AlertaBarrio
            <small>{CITY_NAME}, Nariño</small>
          </span>
        </NavLink>
        <button className="menu-btn" aria-label="Abrir menú" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "✕" : "☰"}
        </button>
        <nav>
          <NavLink to="/" end>Panel</NavLink>
          <NavLink to="/mapa">Mapa</NavLink>
          <NavLink to="/feed">Alertas</NavLink>
          {user && <NavLink to="/reportar">Reportar</NavLink>}
          <NavLink to="/ia">IA</NavLink>
          <NavLink to="/rutas">Ruta segura</NavLink>
          {isModerator && <NavLink to="/moderacion">Moderación</NavLink>}
          <NavLink to="/estructuras">Estructuras</NavLink>
        </nav>
        <div className="user">
          {user ? (
            <>
              <NavLink to="/notificaciones" className="icon" title="Notificaciones">🔔</NavLink>
              <NavLink to="/mis-reportes" title="Mis reportes" className="row gap-s">
                <span className="avatar">{initials}</span>
                <span>{user.full_name.split(" ")[0]}</span>
              </NavLink>
              <NavLink to="/cuenta" title="Seguridad de la cuenta">🔒</NavLink>
              <button className="btn small ghost" onClick={signOut}>Salir</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Entrar</NavLink>
              <NavLink to="/registro" className="btn small">Registrarse</NavLink>
            </>
          )}
        </div>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/mapa" element={<MapPage />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/ia" element={<AIPage />} />
          <Route path="/rutas" element={<RoutePage />} />
          <Route path="/estructuras" element={<Structures />} />
          <Route path="/reportar" element={<Private><NewReport /></Private>} />
          <Route path="/mis-reportes" element={<Private><MyReports /></Private>} />
          <Route path="/cuenta" element={<Private><Account /></Private>} />
          <Route path="/notificaciones" element={<Private><Notifications /></Private>} />
          <Route path="/moderacion" element={<Private moderator><Moderation /></Private>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer muted">AlertaBarrio · {CITY_NAME}, Nariño · Proyecto final de Estructuras de Datos</footer>
    </>
  );
}
