import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { api, API } from "@/lib/api";
import { formatApiError } from "@/lib/errors";
import BrandLogo from "@/components/BrandLogo";
import AuthVisual from "@/components/auth/AuthVisual";
import RegisterFields from "@/components/auth/RegisterFields";
import InstitutionalBadge, { useInstitutionalCheck } from "@/components/auth/InstitutionalBadge";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";

// Google (Emergent Auth) a través del backend: GET /api/auth/google/login?redirect=<URL actual>.
// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function startGoogleAuth() {
  const cleanPath = window.location.pathname.replace(/index\.html$/, "");
  window.location.href = `${API}/auth/google/login?redirect=${encodeURIComponent(`${window.location.origin}${cleanPath}`)}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({ onLogin, initialError = "", initialNotice = "" }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "", program: "Ingeniería Informática", semester: 3 });
  const [error, setError] = useState(initialError);
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(initialNotice);
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [suggestGoogle, setSuggestGoogle] = useState(false);
  const { identity, check } = useInstitutionalCheck(form.email);

  const isProfessor = identity.status === "ok" && identity.role === "professor";
  const clearError = (key) => {
    setFieldErrors((f) => ({ ...f, [key]: "" }));
    setError("");
    if (key === "email" || key === "password") setSuggestGoogle(false);
  };

  const switchMode = () => {
    setMode(mode === "register" ? "login" : "register");
    setError(""); setNotice(""); setFieldErrors({}); setSuggestGoogle(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    const validationErrors = {};
    if (!EMAIL_RE.test(email)) {
      validationErrors.email = "Escribe un correo electrónico válido.";
    }
    if (!form.password) {
      validationErrors.password = "Escribe tu contraseña.";
    } else if (mode === "register" && form.password.length < 6) {
      validationErrors.password = "La contraseña debe tener al menos 6 caracteres.";
    }
    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors);
      setError("Revisa los campos marcados para continuar.");
      return;
    }
    setBusy(true); setError(""); setNotice(""); setSuggestGoogle(false);
    const payload = mode === "register"
      ? { ...form, email, semester: isProfessor ? null : Number(form.semester) }
      : { email, password: form.password };
    try {
      const r = await api.post(mode === "register" ? "/auth/register" : "/auth/login", payload);
      localStorage.setItem("uao_token", r.data.token);
      onLogin(r.data.user);
    } catch (x) {
      const detail = x.response?.data?.detail;
      if (detail?.fields) {
        setFieldErrors(detail.fields);
        setError("Revisa los campos marcados para continuar.");
      } else {
        const message = mode === "login" && x.response?.status === 401
          ? (typeof detail === "string" && detail.includes("se creó con Google")
            ? detail
            : "El correo o la contraseña no coinciden. Usa la contraseña que creaste para UAO Conecta; la de Google, CampusDigital o Moodle no se valida aquí. Si tu cuenta se creó con Google, entra con ese botón y crea una clave desde Configuración.")
          : formatApiError(detail, mode === "register" ? "No pudimos crear tu cuenta." : "No pudimos iniciar sesión. Verifica tu correo y contraseña.");
        setError(x.response ? message : "No pudimos conectar con el servidor. Si acaba de despertar, inténtalo de nuevo en unos segundos.");
        setSuggestGoogle(mode === "login" && x.response?.status === 401);
        if ([403, 409].includes(x.response?.status)) setFieldErrors({ email: message });
      }
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
          <p className="eyebrow">{mode === "register" ? "CREA TU CUENTA UAO CONECTA" : "ACCESO A UAO CONECTA"}</p>
          <h2 data-testid="login-title">Hub de Integración Estudiantil UAO</h2>
          <p className="muted">
            {mode === "register"
              ? "Regístrate con tu correo institucional y crea una contraseña propia para UAO Conecta."
              : "Ingresa con tu cuenta de UAO Conecta o continúa con tu cuenta Google institucional."}
          </p>

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
              aria-describedby={fieldErrors.email ? "email-help auth-email-error" : "email-help"}
              value={form.email}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); clearError("email"); }}
              onBlur={check}
            />
            {fieldErrors.email && <span id="auth-email-error" className="field-error" role="alert" data-testid="auth-email-error">{fieldErrors.email}</span>}
          </label>
          <InstitutionalBadge identity={identity} />

          <label>
            {mode === "register" ? "Crea contraseña de UAO Conecta" : "Contraseña de UAO Conecta"}
            <input
              data-testid="auth-password-input"
              type="password"
              required
              minLength={mode === "register" ? 6 : undefined}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "auth-password-error" : undefined}
              value={form.password}
              onChange={(e) => { setForm({ ...form, password: e.target.value }); clearError("password"); }}
            />
            {fieldErrors.password && <span id="auth-password-error" className="field-error" role="alert">{fieldErrors.password}</span>}
          </label>

          {notice && <div className="auth-notice" role="status" data-testid="auth-notice"><CheckCircle2 size={15} aria-hidden="true" /> {notice}</div>}
          {error && <div className="error" role="alert" data-testid="auth-error">{error}</div>}
          {suggestGoogle && (
            <section className="auth-google-guidance" aria-labelledby="google-guidance-title" data-testid="auth-google-guidance">
              <div>
                <strong id="google-guidance-title">¿Usas tu cuenta institucional de Google?</strong>
                <p>La contraseña de Gmail, CampusDigital o Moodle no se escribe aquí. Entra con Google institucional para continuar; después puedes crear una contraseña propia desde Configuración.</p>
              </div>
              <button type="button" className="google guidance" data-testid="google-login-guidance-button" onClick={startGoogleAuth} disabled={busy}>
                <span className="g-icon" aria-hidden="true">G</span>
                Continuar con Google institucional
              </button>
            </section>
          )}

          <button type="submit" className="primary wide" data-testid="auth-submit-button" disabled={busy}>
            {busy ? "Verificando…" : mode === "register" ? "Crear mi acceso" : "Ingresar al Hub"}
            <ArrowRight size={17} aria-hidden="true" />
          </button>

          <div className="auth-links">
            <button type="button" className="link" data-testid="forgot-password-button" onClick={() => !busy && setForgotOpen(true)} disabled={busy}>
              ¿Olvidaste tu contraseña?
            </button>
            <button type="button" className="link" data-testid="toggle-auth-mode" onClick={switchMode} disabled={busy}>
              {mode === "register" ? "Ya tengo cuenta" : "Crear una cuenta"}
            </button>
          </div>
          <p className="field-hint" id="email-help">Solo correos institucionales @uao.edu.co. Los docentes de Ingeniería se reconocen automáticamente.</p>

          {mode === "login" && (
            <div className="auth-credential-note" role="note" data-testid="auth-credential-note">
              <strong>Sobre la contraseña manual</strong>
              <p>Es una clave propia de UAO Conecta. Si solo has entrado con Google, continúa con Google y luego crea tu clave desde Configuración.</p>
            </div>
          )}

          <div className="or-divider auth-google-divider" aria-hidden="true"><span>o continúa con Google</span></div>
          <button type="button" className="google featured" data-testid="google-login-button" onClick={startGoogleAuth} disabled={busy}>
            <span className="g-icon" aria-hidden="true">G</span>
            <span>Continuar con Google institucional</span>
          </button>
        </form>
      </div>
      <ForgotPasswordModal open={forgotOpen} initialEmail={form.email} onClose={() => setForgotOpen(false)} />
    </main>
  );
}
