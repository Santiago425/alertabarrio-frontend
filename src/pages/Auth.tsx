import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox } from "../components/ui";
import { CITY_NAME } from "../lib/format";
import { PASSWORD_RULES, passwordBytes, passwordStrength } from "../lib/password";
import { useAsync } from "../lib/useAsync";

const DEMO_USERS = [
  ["ana@alertabarrio.co", "Vecina (Centro)"],
  ["moderador@alertabarrio.co", "Moderador"],
];

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-wrap">
      <aside className="auth-side">
        <div>
          <p className="eyebrow">AlertaBarrio · {CITY_NAME}</p>
          <h2>Tu barrio más seguro, entre todos.</h2>
          <p>Reporta incidentes, recibe alertas de tu barrio y consulta las zonas de riesgo que detecta la IA.</p>
        </div>
        <ul>
          <li>🔒 <span>Contraseñas guardadas con <b>bcrypt</b>: ni nosotros podemos verlas.</span></li>
          <li>🛡️ <span>Bloqueo automático después de 5 intentos fallidos.</span></li>
          <li>🤖 <span>La IA clasifica cada reporte y calcula el riesgo de la zona.</span></li>
        </ul>
      </aside>
      <section className="auth-box">{children}</section>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
      />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
        {show ? "Ocultar" : "Ver"}
      </button>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const s = passwordStrength(password);
  return (
    <div className="strength">
      <div className="strength-bar">
        <span style={{ width: `${(s.score / 5) * 100}%`, background: s.color }} />
      </div>
      <ul className="rules">
        {PASSWORD_RULES.map((r) => (
          <li key={r.label} className={r.test(password) ? "ok" : ""}>
            {r.test(password) ? "✓" : "○"} {r.label}
          </li>
        ))}
        {s.label && <li style={{ color: s.color, fontWeight: 700 }}>{s.label}</li>}
      </ul>
      {passwordBytes(password) > 72 && <small className="alert-error">La contraseña es demasiado larga.</small>}
    </div>
  );
}

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
      navigate(resp.user.role === "citizen" ? "/" : "/moderacion");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h2>Iniciar sesión</h2>
      <p className="muted">Bienvenido de nuevo.</p>
      <form onSubmit={submit} className="form">
        <label>
          Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label>
          Contraseña
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
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
    </AuthLayout>
  );
}

export function Register() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const neighborhoods = useAsync(() => api.neighborhoods(), []);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "", phone: "", neighborhood_id: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const strong = passwordStrength(form.password).valid;
  const matches = form.password === form.confirm;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!strong) return setError("La contraseña no cumple los requisitos.");
    if (!matches) return setError("Las contraseñas no coinciden.");
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
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <h2>Crear cuenta</h2>
      <p className="muted">Te toma menos de un minuto.</p>
      <form onSubmit={submit} className="form">
        <label>
          Nombre completo
          <input value={form.full_name} onChange={set("full_name")} autoComplete="name" required minLength={3} />
        </label>
        <label>
          Correo
          <input type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
        </label>
        <label>
          Contraseña
          <PasswordInput value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" />
        </label>
        <PasswordStrength password={form.password} />
        <label>
          Repetir contraseña
          <PasswordInput value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} autoComplete="new-password" />
          {form.confirm && !matches && <small style={{ color: "var(--primary)" }}>No coinciden</small>}
        </label>
        <label>
          Teléfono (opcional)
          <input value={form.phone} onChange={set("phone")} autoComplete="tel" />
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
        <button className="btn" disabled={busy || !strong || !matches}>
          {busy ? "Creando…" : "Registrarme"}
        </button>
      </form>
      <p className="muted">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </AuthLayout>
  );
}

export function Account() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const strong = passwordStrength(next).valid;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) return setError("Las contraseñas nuevas no coinciden.");
    setBusy(true);
    setError(null);
    try {
      await api.changePassword(current, next);
      setMsg("Listo, tu contraseña se cambió.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="narrow stack-l" style={{ margin: "0 auto" }}>
      <div>
        <p className="eyebrow">Mi cuenta</p>
        <h2>Seguridad</h2>
        <p className="muted">
          {user?.full_name} · {user?.email}
        </p>
      </div>
      <section className="card">
        <h3>Cambiar contraseña</h3>
        <form onSubmit={submit} className="form" style={{ marginTop: 12 }}>
          <label>
            Contraseña actual
            <PasswordInput value={current} onChange={setCurrent} autoComplete="current-password" />
          </label>
          <label>
            Nueva contraseña
            <PasswordInput value={next} onChange={setNext} autoComplete="new-password" />
          </label>
          <PasswordStrength password={next} />
          <label>
            Repetir nueva contraseña
            <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
          </label>
          <ErrorBox message={error} />
          {msg && <div className="alert-ok">{msg}</div>}
          <button className="btn" disabled={busy || !strong || !current}>
            {busy ? "Guardando…" : "Cambiar contraseña"}
          </button>
        </form>
      </section>
      <section className="card mini">
        <h3>¿Cómo protegemos tu contraseña?</h3>
        <ul className="steps">
          <li>
            No guardamos tu contraseña: guardamos un <b>hash bcrypt</b> (costo 12, con sal única por usuario). Es de una
            sola vía, no se puede “desencriptar”.
          </li>
          <li>Al iniciar sesión se vuelve a calcular el hash y se compara.</li>
          <li>Después de 5 intentos fallidos la cuenta se bloquea 10 minutos para frenar ataques de fuerza bruta.</li>
          <li>La sesión usa un token JWT firmado que vence a las 12 horas.</li>
        </ul>
      </section>
    </div>
  );
}
