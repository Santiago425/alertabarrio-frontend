import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox } from "../components/ui";
import { useAsync } from "../lib/useAsync";

const DEMO_USERS = [
  ["ana@alertabarrio.co", "Vecina (Chapinero)"],
  ["moderador@alertabarrio.co", "Moderador"],
];

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const resp = await api.login(email, password);
      signIn(resp);
      navigate(resp.user.role === "citizen" ? "/feed" : "/moderacion");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-box card">
      <h2>Iniciar sesión</h2>
      <form onSubmit={submit} className="form">
        <label>
          Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <ErrorBox message={error} />
        <button className="btn" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="muted">
        ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
      </p>
      <div className="demo">
        <small className="muted">Cuentas de prueba (contraseña Alerta2026*):</small>
        {DEMO_USERS.map(([mail, label]) => (
          <button
            key={mail}
            className="btn small ghost"
            type="button"
            onClick={() => {
              setEmail(mail);
              setPassword("Alerta2026*");
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Register() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const neighborhoods = useAsync(() => api.neighborhoods(), []);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "", neighborhood_id: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const resp = await api.register({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        neighborhood_id: form.neighborhood_id ? Number(form.neighborhood_id) : null,
      });
      signIn(resp);
      navigate("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-box card">
      <h2>Crear cuenta</h2>
      <form onSubmit={submit} className="form">
        <label>
          Nombre completo
          <input value={form.full_name} onChange={set("full_name")} required minLength={3} />
        </label>
        <label>
          Correo
          <input type="email" value={form.email} onChange={set("email")} required />
        </label>
        <label>
          Contraseña (mínimo 6 caracteres)
          <input type="password" value={form.password} onChange={set("password")} required minLength={6} />
        </label>
        <label>
          Teléfono (opcional)
          <input value={form.phone} onChange={set("phone")} />
        </label>
        <label>
          Mi barrio (te suscribimos a sus alertas)
          <select value={form.neighborhood_id} onChange={set("neighborhood_id")}>
            <option value="">— Elegir —</option>
            {neighborhoods.data?.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </label>
        <ErrorBox message={error} />
        <button className="btn" disabled={busy}>
          {busy ? "Creando…" : "Registrarme"}
        </button>
      </form>
      <p className="muted">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </div>
  );
}
