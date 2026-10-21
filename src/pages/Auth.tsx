import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import Icon, { type IconName } from "../components/Icon";
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
    <div className="auth">
      <section className="auth-form">
        <Link to="/" className="auth-logo">
          <img src="/favicon.svg" alt="" width={34} height={34} />
          <span>AlertaBarrio</span>
        </Link>
        <div className="auth-inner">{children}</div>
        <small className="muted">© {new Date().getFullYear()} AlertaBarrio · {CITY_NAME}</small>
      </section>
      <aside className="auth-show">
        <div className="show-copy">
          <h2>Tu barrio, más seguro entre todos.</h2>
          <p>Alertas en tiempo real, mapa de riesgo y un asistente con inteligencia artificial.</p>
        </div>
        <div className="show-cards">
          <div className="float-card a">
            <span className="tile-icon hot-dot"><Icon name="alert" size={18} /></span>
            <div>
              <b>Robo reportado</b>
              <small>Centro · hace 3 min</small>
            </div>
          </div>
          <div className="float-card b">
            <span className="tile-icon ai-dot"><Icon name="sparkles" size={18} /></span>
            <div>
              <b>“Evita la Calle 18 después de las 9 p. m.”</b>
              <small>Asistente IA</small>
            </div>
          </div>
          <div className="float-card c">
            <span className="tile-icon ok-dot"><Icon name="check" size={18} /></span>
            <div>
              <b>Alerta verificada</b>
              <small>2 vecinos confirmaron</small>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <div className="field">
      <Icon name={icon} size={18} className="field-icon" />
      {children}
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  autoComplete,
  placeholder = "Contraseña",
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Field icon="lock">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-label={placeholder}
        required
      />
      <button type="button" className="field-toggle" onClick={() => setShow(!show)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
        <Icon name={show ? "eyeOff" : "eye"} size={18} />
      </button>
    </Field>
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
      <h1 className="auth-title">Bienvenido de nuevo</h1>
      <p className="muted">Inicia sesión para ver las alertas de tu barrio.</p>
      <form onSubmit={submit} className="form auth-fields">
        <Field icon="mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="Correo electrónico" aria-label="Correo" required />
        </Field>
        <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        <ErrorBox message={error} />
        <button className="btn block big" disabled={busy}>
          {busy ? "Entrando…" : "Iniciar sesión"}
        </button>
      </form>
      <div className="divider"><span>o entra con una cuenta de prueba</span></div>
      <div className="demo-row">
        {DEMO_USERS.map(([mail, label]) => (
          <button
            key={mail}
            className="btn ghost"
            type="button"
            onClick={() => {
              setEmail(mail);
              setPassword("Alerta2026*");
            }}
          >
            <Icon name={mail.startsWith("moderador") ? "shield" : "user"} size={16} /> {label}
          </button>
        ))}
      </div>
      <p className="auth-switch">
        ¿No tienes cuenta? <Link to="/registro">Regístrate gratis</Link>
      </p>
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
      <h1 className="auth-title">Crea tu cuenta</h1>
      <p className="muted">Únete a los vecinos que cuidan {CITY_NAME}.</p>
      <form onSubmit={submit} className="form auth-fields">
        <Field icon="user">
          <input value={form.full_name} onChange={set("full_name")} autoComplete="name" placeholder="Nombre completo" aria-label="Nombre completo" required minLength={3} />
        </Field>
        <Field icon="mail">
          <input type="email" value={form.email} onChange={set("email")} autoComplete="email" placeholder="Correo electrónico" aria-label="Correo" required />
        </Field>
        <PasswordInput value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" />
        {form.password && <PasswordStrength password={form.password} />}
        <PasswordInput value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} autoComplete="new-password" placeholder="Repite la contraseña" />
        {form.confirm && !matches && <small style={{ color: "var(--primary)" }}>Las contraseñas no coinciden</small>}
        <Field icon="pin">
          <select value={form.neighborhood_id} onChange={set("neighborhood_id")} aria-label="Mi barrio">
            <option value="">Mi barrio (opcional)</option>
            {neighborhoods.data?.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </Field>
        <ErrorBox message={error} />
        <button className="btn block big" disabled={busy || !strong || !matches}>
          {busy ? "Creando…" : "Crear cuenta"}
        </button>
      </form>
      <p className="auth-switch">
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
