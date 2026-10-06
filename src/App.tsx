import type { ReactNode } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import AIPage from "./pages/AIPage";
import { Login, Register } from "./pages/Auth";
import Feed, { MyReports } from "./pages/Feed";
import Home from "./pages/Home";
import MapPage from "./pages/MapPage";
import Moderation from "./pages/Moderation";
import NewReport from "./pages/NewReport";
import Notifications from "./pages/Notifications";
import RoutePage from "./pages/RoutePage";
import Structures from "./pages/Structures";

function Private({ children, moderator = false }: { children: ReactNode; moderator?: boolean }) {
  const { user, loading, isModerator } = useAuth();
  if (loading) return <p className="muted">Cargando…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (moderator && !isModerator) return <p>Esta sección es solo para moderadores.</p>;
  return <>{children}</>;
}

export default function App() {
  const { user, isModerator, signOut } = useAuth();
  return (
    <>
      <header className="topbar">
        <NavLink to="/" className="brand">
          <img src="/favicon.svg" alt="" width={26} height={26} /> AlertaBarrio
        </NavLink>
        <nav>
          <NavLink to="/mapa">Mapa</NavLink>
          <NavLink to="/feed">Alertas</NavLink>
          {user && <NavLink to="/reportar">Reportar</NavLink>}
          <NavLink to="/ia">IA</NavLink>
          <NavLink to="/rutas">Ruta segura</NavLink>
          {isModerator && <NavLink to="/moderacion">Moderación</NavLink>}
          <NavLink to="/estructuras">Estructuras</NavLink>
        </nav>
        <div className="row gap-s">
          {user ? (
            <>
              <NavLink to="/notificaciones" title="Notificaciones">🔔</NavLink>
              <NavLink to="/mis-reportes" className="muted">{user.full_name.split(" ")[0]}</NavLink>
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
          <Route path="/notificaciones" element={<Private><Notifications /></Private>} />
          <Route path="/moderacion" element={<Private moderator><Moderation /></Private>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer muted">AlertaBarrio · Proyecto final de Estructuras de Datos</footer>
    </>
  );
}
