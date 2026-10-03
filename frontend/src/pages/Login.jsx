import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { api, API } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import BrandLogo from "@/components/BrandLogo";
import AuthVisual from "@/components/auth/AuthVisual";
import RegisterFields from "@/components/auth/RegisterFields";
import InstitutionalBadge, { useInstitutionalCheck } from "@/components/auth/InstitutionalBadge";
import SyncOverlay, { SYNC_DURATION } from "@/components/auth/SyncOverlay";

// Google (Emergent Auth) a través del backend: GET /api/auth/google/login?redirect=<URL actual>.
// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function startGoogleAuth() {
  const cleanPath = window.location.pathname.replace(/index\.html$/, "");
  window.location.href = `${API}/auth/google/login?redirect=${encodeURIComponent(`${window.location.origin}${cleanPath}`)}`;
}

const INSTITUTIONAL_RE = /@uao\.edu\.co$/i;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Login({ onLogin, initialError = "", initialNotice = "" }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "", program: "Ingeniería Informática", semester: 3 });
  const [error, setError] = useState(initialError);
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(initialNotice);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { identity, check } = useInstitutionalCheck(form.email);

  const isProfessor = identity.status === "ok" && identity.role === "professor";
  const clearError = (key) => setFieldErrors((f) => ({ ...f, [key]: "" }));

  const switchMode = () => {
    setMode(mode === "register" ? "login" : "register");
    setError(""); setNotice(""); setFieldErrors({});
  };

  const submit = async (e) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!INSTITUTIONAL_RE.test(email)) {
      setFieldErrors({ email: "Solo se permiten correos institucionales @uao.edu.co." });
      setError("Usa tu correo institucional para continuar.");
      return;
    }
    setBusy(true); setSyncing(true); setError(""); setNotice("");
    const payload = mode === "register"
      ? { ...form, email, semester: isProfessor ? null : Number(form.semester) }
      : { email, password: form.password };
    try {
      const [r] = await Promise.all([api.post(mode === "register" ? "/auth/register" : "/auth/login", payload), delay(SYNC_DURATION)]);
      localStorage.setItem("uao_token", r.data.token);
      onLogin(r.data.user);
    } catch (x) {
      const detail = x.response?.data?.detail;
      if (detail?.fields) {
        setFieldErrors(detail.fields);
        setError("Revisa los campos marcados para continuar.");
      } else {
        const message = formatApiError(detail, mode === "register" ? "No pudimos crear tu cuenta." : "No pudimos iniciar sesión. Verifica tu correo y contraseña.");
        setError(x.response ? message : "No pudimos conectar con el servidor. Si acaba de despertar, inténtalo de nuevo en unos segundos.");
        if (x.response?.status === 409) setFieldErrors({ email: message });
      }
      setSyncing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth" data-testid="login-page">
      <AuthVisual />
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit} noValidate>
          <BrandLogo caption="Hub de Integración Estudiantil" size="sm" testId="auth-form-logo" />
          <p className="eyebrow">{mode === "register" ? "CREA TU ACCESO INSTITUCIONAL" : "ACCESO CON CUENTA UAO"}</p>
          <h2 data-testid="login-title">Hub de Integración Estudiantil UAO</h2>
          <p className="muted">
            {mode === "register"
              ? "Verificamos tu correo contra los sistemas de la universidad y traemos tus datos."
              : "Una sola sesión para Moodle, Teams, Banner y el apoyo académico entre pares."}
          </p>

          <button type="button" className="google featured" data-testid="google-login-button" onClick={startGoogleAuth} disabled={busy}>
            <span className="g-icon" aria-hidden="true">G</span>
            <span>Continuar con Google institucional</span>
          </button>
          <div className="or-divider" aria-hidden="true"><span>o con tu correo @uao.edu.co</span></div>

          {mode === "register" && (
            <RegisterFields form={form} setForm={setForm} fieldErrors={fieldErrors} clearError={clearError} isProfessor={isProfessor} />
          )}

          <label>
            Correo institucional
            <input
              data-testid="auth-email-input"
              type="email"
              required
              autoComplete="email"
              placeholder="nombre@uao.edu.co"
              aria-invalid={!!fieldErrors.email}
              aria-describedby="email-help"
              value={form.email}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); clearError("email"); }}
              onBlur={check}
            />
            {fieldErrors.email && <span className="field-error" role="alert" data-testid="auth-email-error">{fieldErrors.email}</span>}
          </label>
          <InstitutionalBadge identity={identity} />

          <label>
            Contraseña
            <input
              data-testid="auth-password-input"
              type="password"
              required
              minLength={mode === "register" ? 6 : undefined}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              aria-invalid={!!fieldErrors.password}
              value={form.password}
              onChange={(e) => { setForm({ ...form, password: e.target.value }); clearError("password"); }}
            />
            {fieldErrors.password && <span className="field-error" role="alert">{fieldErrors.password}</span>}
          </label>

          {notice && <div className="auth-notice" role="status" data-testid="auth-notice"><CheckCircle2 size={15} aria-hidden="true" /> {notice}</div>}
          {error && <div className="error" role="alert" data-testid="auth-error">{error}</div>}

          <button type="submit" className="primary wide" data-testid="auth-submit-button" disabled={busy || identity.status === "rejected"}>
            {busy ? "Conectando…" : mode === "register" ? "Crear mi acceso" : "Ingresar al Hub"}
            <ArrowRight size={17} aria-hidden="true" />
          </button>

          <div className="auth-links">
            <Link to="/recuperar-contrasena" className="link" data-testid="forgot-password-button" onClick={(e) => busy && e.preventDefault()}>
              ¿Olvidaste tu contraseña?
            </Link>
            <button type="button" className="link" data-testid="toggle-auth-mode" onClick={switchMode} disabled={busy}>
              {mode === "register" ? "Ya tengo cuenta" : "Crear una cuenta"}
            </button>
          </div>
          <p className="field-hint" id="email-help">Solo correos institucionales @uao.edu.co. Los docentes de Ingeniería se reconocen automáticamente.</p>
        </form>
      </div>
      <SyncOverlay active={syncing} name={form.name.split(" ")[0]} />
    </main>
  );
}
