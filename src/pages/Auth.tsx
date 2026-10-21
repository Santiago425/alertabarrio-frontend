import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { api, ApiError } from "../api/client";
import type { User } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import Icon, { type IconName } from "../components/Icon";
import { CityArt } from "../components/Art";
import Logo from "../components/Logo";
import { ErrorBox } from "../components/ui";
import { CITY_NAME, timeAgo } from "../lib/format";
import { PASSWORD_RULES, passwordBytes, passwordStrength } from "../lib/password";
import { useAsync } from "../lib/useAsync";

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "plus", title: "Reporta incidentes", text: "Robos, riñas o daños con ubicación exacta." },
  { icon: "map", title: "Mapa en vivo", text: "Mira las alertas de la ciudad en tiempo real." },
  { icon: "bell", title: "Alertas de tu barrio", text: "Recibe avisos de los barrios que sigues." },
  { icon: "sparkles", title: "Asistente con IA", text: "Pregunta qué zonas evitar y a qué hora." },
  { icon: "route", title: "Ruta segura", text: "Encuentra el camino con menos riesgo." },
  { icon: "shield", title: "Alertas verificadas", text: "Moderadores confirman cada reporte." },
];

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <section className="auth-form">
        <Link to="/" className="auth-logo">
          <Logo size={38} />
          <span>AlertaBarrio</span>
        </Link>
        <div className="auth-inner">{children}</div>
        <small className="muted">© {new Date().getFullYear()} AlertaBarrio · {CITY_NAME}</small>
      </section>
      <aside className="auth-show">
        <CityArt className="show-art" />
        <div className="show-copy">
          <h2>Tu barrio, más seguro entre todos.</h2>
          <p>AlertaBarrio conecta a los vecinos de {CITY_NAME} para avisar y prevenir incidentes.</p>
        </div>
        <ul className="features">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <span className="f-icon"><Icon name={f.icon} size={18} /></span>
              <div>
                <b>{f.title}</b>
                <small>{f.text}</small>
              </div>
            </li>
          ))}
        </ul>
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
  const [otp, setOtp] = useState("");
  const [needsOtp, setNeedsOtp] = useState(false);
  const [kind, setKind] = useState<"user" | "admin">("user");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const resp = await api.login(email, password, kind, needsOtp ? otp : undefined);
      signIn(resp);
      navigate(resp.user.role === "citizen" ? "/" : "/moderacion");
    } catch (err) {
      if (err instanceof ApiError && err.twoFactorRequired && !needsOtp) {
        setNeedsOtp(true);
      } else {
        setError(err instanceof Error ? err.message : "Error");
      }
    } finally {
      setBusy(false);
    }
  };

  if (needsOtp) {
    return (
      <AuthLayout>
        <h1 className="auth-title">Verificación en dos pasos</h1>
        <p className="muted">Abre tu app de autenticación y escribe el código de 6 dígitos.</p>
        <form onSubmit={submit} className="form auth-fields">
          <div className="field">
            <input
              className="otp-input"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              aria-label="Código de verificación"
              autoFocus
              required
            />
          </div>
          <ErrorBox message={error} />
          <button className="btn block big" disabled={busy || otp.length !== 6}>
            {busy ? "Verificando…" : "Verificar y entrar"}
          </button>
        </form>
        <p className="auth-switch">
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setNeedsOtp(false);
              setOtp("");
              setError(null);
            }}
          >
            ← Volver
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="auth-title">Bienvenido de nuevo</h1>
      <div className="role-switch" role="tablist" aria-label="Tipo de cuenta">
        {(
          [
            ["user", "user", "Usuario"],
            ["admin", "shield", "Administrador"],
          ] as const
        ).map(([value, icon, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={kind === value}
            className={kind === value ? "on" : ""}
            onClick={() => {
              setKind(value);
              setError(null);
            }}
          >
            <Icon name={icon} size={16} /> {label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="form auth-fields">
        <Field icon="mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="Correo electrónico" aria-label="Correo" required />
        </Field>
        <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        <ErrorBox message={error} />
        <button className="btn block big" disabled={busy}>
          {busy ? "Entrando…" : kind === "admin" ? "Entrar como administrador" : "Iniciar sesión"}
        </button>
      </form>
      {kind === "user" && (
        <p className="auth-switch">
          ¿No tienes cuenta? <Link to="/registro">Regístrate gratis</Link>
        </p>
      )}
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
  const { user, signIn, updateUser } = useAuth();
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

  const [sessionMsg, setSessionMsg] = useState<string | null>(null);
  const logoutAll = async () => {
    setSessionMsg(null);
    try {
      signIn(await api.logoutAll());
      setSessionMsg("Se cerraron las sesiones en los demás dispositivos.");
    } catch (err) {
      setSessionMsg(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <div className="stack-l">
      <div>
        <h2>Seguridad de tu cuenta</h2>
        <p className="muted">
          {user?.full_name} · {user?.email}
          {user?.last_login_at && <> · último ingreso {timeAgo(user.last_login_at)}</>}
        </p>
      </div>
      <div className="sec-grid">
        <TwoFactorCard onChange={updateUser} enabled={!!user?.two_factor_enabled} />

        <section className="panel">
          <div className="panel-head">
            <h3>
              <Icon name="logout" size={16} /> Sesiones abiertas
            </h3>
          </div>
          <button className="btn ghost" onClick={logoutAll}>
            Cerrar sesión en todos los dispositivos
          </button>
          {sessionMsg && <div className="alert-ok" style={{ marginTop: 12 }}>{sessionMsg}</div>}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h3>
              <Icon name="lock" size={16} /> Cambiar contraseña
            </h3>
          </div>
          <form onSubmit={submit} className="form">
            <PasswordInput value={current} onChange={setCurrent} autoComplete="current-password" placeholder="Contraseña actual" />
            <PasswordInput value={next} onChange={setNext} autoComplete="new-password" placeholder="Nueva contraseña" />
            {next && <PasswordStrength password={next} />}
            <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" placeholder="Repite la nueva contraseña" />
            <ErrorBox message={error} />
            {msg && <div className="alert-ok">{msg}</div>}
            <button className="btn" disabled={busy || !strong || !current}>
              {busy ? "Guardando…" : "Cambiar contraseña"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function TwoFactorCard({ enabled, onChange }: { enabled: boolean; onChange: (u: User) => void }) {
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const start = () =>
    run(async () => {
      const s = await api.twoFactorSetup();
      setSetup({ secret: s.secret, qr: await QRCode.toDataURL(s.otpauth_uri, { margin: 1, width: 320 }) });
    });
  const enable = () =>
    run(async () => {
      onChange(await api.twoFactorEnable(code));
      setSetup(null);
      setCode("");
    });
  const disable = () =>
    run(async () => {
      onChange(await api.twoFactorDisable(password, code));
      setCode("");
      setPassword("");
    });

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>
          <Icon name="shield" size={16} /> Verificación en dos pasos
        </h3>
        <span className={enabled ? "state-on" : "state-off"}>{enabled ? "Activada" : "Desactivada"}</span>
      </div>

      {!enabled && !setup && (
        <button className="btn" onClick={start} disabled={busy}>
          Activar verificación en dos pasos
        </button>
      )}

      {!enabled && setup && (
        <div className="form">
          <div className="qr-box">
            <img src={setup.qr} alt="Código QR para la app de autenticación" />
            <div>
              <p>1. Escanea el código con tu app.</p>
              <p className="muted">¿No puedes escanear? Escribe esta clave:</p>
              <div className="secret">{setup.secret}</div>
            </div>
          </div>
          <p>2. Escribe el código de 6 dígitos que te muestra la app:</p>
          <div className="field">
            <input className="otp-input" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="000000" aria-label="Código" />
          </div>
          <button className="btn" onClick={enable} disabled={busy || code.length !== 6}>
            Confirmar y activar
          </button>
        </div>
      )}

      {enabled && (
        <div className="form">
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
          <div className="field">
            <input className="otp-input" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="000000" aria-label="Código" />
          </div>
          <button className="btn ghost" onClick={disable} disabled={busy || code.length !== 6 || !password}>
            Desactivar
          </button>
        </div>
      )}
      <ErrorBox message={error} />
    </section>
  );
}
