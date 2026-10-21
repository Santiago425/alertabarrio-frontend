import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { api } from "./api/client";
import { useAuth } from "./auth/AuthContext";
import { AssistantFab } from "./components/Assistant";
import ErrorBoundary from "./components/ErrorBoundary";
import Icon, { type IconName } from "./components/Icon";
import Logo from "./components/Logo";
import { CITY_NAME } from "./lib/format";
import { useAiOnline } from "./lib/useAiOnline";
import { useAsync } from "./lib/useAsync";
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

const TITLES: Record<string, string> = {
  "/": "Panel",
  "/mapa": "Mapa en vivo",
  "/feed": "Alertas",
  "/reportar": "Reportar incidente",
  "/ia": "Inteligencia artificial",
  "/rutas": "Ruta segura",
  "/moderacion": "Moderación",
  "/estructuras": "Estructuras de datos",
  "/notificaciones": "Notificaciones",
  "/mis-reportes": "Mis reportes",
  "/cuenta": "Mi cuenta",
};

function Private({ children, moderator = false }: { children: ReactNode; moderator?: boolean }) {
  const { user, loading, isModerator } = useAuth();
  if (loading) return <p className="muted">Cargando…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (moderator && !isModerator) return <p>Esta sección es solo para moderadores.</p>;
  return <>{children}</>;
}

function NavItem({ to, icon, label, end }: { to: string; icon: IconName; label: string; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className="side-link">
      <Icon name={icon} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function App() {
  const { user, loading, isModerator } = useAuth();
  const location = useLocation();
  const isAuth = location.pathname === "/login" || location.pathname === "/registro";

  if (loading) return null;
  if (!user) {
    if (!isAuth) return <Navigate to="/login" replace />;
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />
      </Routes>
    );
  }
  if (isAuth) return <Navigate to={isModerator ? "/moderacion" : "/"} replace />;
  return <Shell />;
}

function Shell() {
  const { user, isModerator, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useAiOnline();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const notes = useAsync(() => (user ? api.notifications() : Promise.resolve([])), [user?.id, location.pathname]);
  const subs = useAsync(() => (user ? api.mySubscriptions() : Promise.resolve([])), [user?.id]);
  const unread = notes.data?.filter((n) => !n.is_read).length ?? 0;
  const initials = (user?.full_name ?? "").split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const title = TITLES[location.pathname] ?? "AlertaBarrio";

  return (
    <div className={`shell ${open ? "menu-open" : ""}`}>
      <aside className="sidebar">
        <Link to="/" className="side-brand">
          <Logo size={36} />
          <span>
            AlertaBarrio
            <small>{CITY_NAME}, Nariño</small>
          </span>
        </Link>

        <nav className="side-nav">
          <NavItem to="/" end icon="home" label="Panel" />
          <NavItem to="/mapa" icon="map" label="Mapa en vivo" />
          <NavItem to="/feed" icon="alert" label="Alertas" />
          {user && <NavItem to="/reportar" icon="plus" label="Reportar" />}
          <NavItem to="/ia" icon="sparkles" label="Inteligencia artificial" />
          <NavItem to="/rutas" icon="route" label="Ruta segura" />
          {isModerator && <NavItem to="/moderacion" icon="shield" label="Moderación" />}
          <NavItem to="/estructuras" icon="layers" label="Estructuras" />
        </nav>

        {user && !!subs.data?.length && (
          <div className="side-section">
            <p className="side-title">Mis barrios</p>
            {subs.data.slice(0, 5).map((s, i) => (
              <Link key={s.neighborhood.id} to="/feed" className="side-hood">
                <i style={{ background: ["#fff", "#fde047", "#67e8f9", "#86efac", "#fda4af"][i % 5] }} />
                {s.neighborhood.name}
              </Link>
            ))}
          </div>
        )}

        <div className="side-bottom">
          <NavItem to="/cuenta" icon="lock" label="Mi cuenta" />
          <button className="side-link" onClick={signOut}>
            <Icon name="logout" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
      <div className="backdrop" onClick={() => setOpen(false)} />

      <div className="main">
        <header className="header">
          <button className="icon-btn menu-btn" aria-label="Abrir menú" onClick={() => setOpen(true)}>
            <Icon name="menu" />
          </button>
          <h1>{title}</h1>
          <div className="header-actions">
            <Link to="/reportar" className="btn small hide-sm">
              <Icon name="plus" size={16} /> Reportar
            </Link>
            <Link to="/notificaciones" className="icon-btn" aria-label="Notificaciones">
              <Icon name="bell" />
              {unread > 0 && <span className="count">{unread > 9 ? "9+" : unread}</span>}
            </Link>
            <Link to="/mis-reportes" className="user-pill">
              <span className="avatar">{initials}</span>
              <span className="hide-sm">
                {(user?.full_name ?? "").split(" ")[0]}
                <small>{isModerator ? "Administrador" : "Usuario"}</small>
              </span>
            </Link>
          </div>
        </header>

        <main className="content">
          <ErrorBoundary resetKey={location.pathname}>
          <Routes>
            <Route path="/" element={<Home />} />
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
          </ErrorBoundary>
        </main>
      </div>
      <ErrorBoundary>
        <AssistantFab />
      </ErrorBoundary>
    </div>
  );
}
