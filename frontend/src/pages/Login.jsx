import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { PROGRAM_NAMES, SEMESTERS } from "@/lib/programs";
import { formatApiError } from "@/lib/errors";

// Redirección al flujo de inicio de sesión con Google en tu propio backend
function startGoogleAuth() {
  const cleanPath = window.location.pathname.replace(/index\.html$/, "");
  const redirect = `${window.location.origin}${cleanPath}`;

  // Obtiene la URL base del backend desde la configuración de la API
  const backendBaseUrl =
    process.env.REACT_APP_API_URL ||
    api.defaults?.baseURL ||
    "http://localhost:8000";

  // Redirige al endpoint del backend para iniciar OAuth con Google
  window.location.href = `${backendBaseUrl}/auth/google/login?redirect=${encodeURIComponent(
    redirect
  )}`;
}

export default function Login({
  onLogin,
  initialError = "",
  initialNotice = "",
}) {
  const [mode, setMode] = useState("login"); // 'login' | 'register'

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "student",
    program: "Ingeniería Informática",
    semester: 3,
  });

  const [error, setError] = useState(initialError);
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(initialNotice);
  const [busy, setBusy] = useState(false);

  const checkEmail = async () => {
    if (mode !== "register" || !form.email.includes("@")) {
      return;
    }

    try {
      const r = await api.get("/auth/email-available", {
        params: { email: form.email },
      });

      setFieldErrors((f) => ({
        ...f,
        email: r.data.available ? "" : r.data.reason,
      }));
    } catch {
      // La validación definitiva ocurre en el backend.
    }
  };

  const submit = async (e) => {
    e.preventDefault();

    if (mode === "register" && fieldErrors.email) {
      setError(fieldErrors.email);
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const payload =
        mode === "register"
          ? {
              ...form,
              semester:
                form.role === "student" ? Number(form.semester) : null,
            }
          : {
              email: form.email,
              password: form.password,
            };

      const r = await api.post(
        mode === "register" ? "/auth/register" : "/auth/login",
        payload
      );

      localStorage.setItem("uao_token", r.data.token);
      onLogin(r.data.user);
    } catch (x) {
      const detail = x.response?.data?.detail;

      if (detail?.fields) {
        setFieldErrors(detail.fields);
        setError("Revisa los campos marcados para continuar.");
      } else {
        const message = formatApiError(
          detail,
          mode === "register"
            ? "No pudimos crear tu cuenta."
            : "No pudimos iniciar sesión. Verifica tu correo y contraseña."
        );

        setError(message);

        if (x.response?.status === 409) {
          setFieldErrors({ email: message });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth">
      <div className="auth-visual">
        <div className="brand-mark">
          UAO <span>Conecta</span>
        </div>

        <div>
          <p className="eyebrow">ENCONTRAR · COORDINAR · SABER</p>
          <h1>
            La universidad,
            <br />
            <em>más cerca.</em>
          </h1>
          <p className="auth-copy">
            Personas, respuestas y apoyo académico en un solo lugar.
          </p>
        </div>

        <div className="quote">
          “Siempre hay alguien que sabe cómo ayudarte.”
        </div>
      </div>

      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <div className="brand-mobile brand-mark">
            UAO <span>Conecta</span>
          </div>

          <p className="eyebrow">
            {mode === "register" ? "CREA TU PERFIL" : "BIENVENIDO DE NUEVO"}
          </p>

          <h2>
            {mode === "register"
              ? "Únete a tu comunidad académica"
              : "Entra a tu espacio"}
          </h2>

          <p className="muted">
            {mode === "register"
              ? "Tu perfil te conecta con personas y oportunidades."
              : "Todo lo que necesitas para seguir avanzando."}
          </p>

          {/* Inicio de sesión con Google */}
          <button
            type="button"
            className="google featured"
            data-testid="google-login-button"
            onClick={startGoogleAuth}
            disabled={busy}
          >
            <span className="g-icon" aria-hidden="true">
              G
            </span>
            <span>Continuar con Google</span>
          </button>

          <div className="or-divider" aria-hidden="true">
            <span>o con tu correo</span>
          </div>

          {mode === "register" && (
            <>
              <label>
                Nombre completo
                <input
                  data-testid="register-name-input"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
                {fieldErrors.name && (
                  <span className="field-error" role="alert">
                    {fieldErrors.name}
                  </span>
                )}
              </label>

              <label>
                Usuario
                <input
                  data-testid="register-username-input"
                  required
                  minLength={3}
                  autoComplete="username"
                  aria-invalid={!!fieldErrors.username}
                  value={form.username}
                  onChange={(e) => {
                    setForm({ ...form, username: e.target.value });
                    setFieldErrors((f) => ({ ...f, username: "" }));
                  }}
                />
                {fieldErrors.username && (
                  <span
                    className="field-error"
                    role="alert"
                    data-testid="register-username-error"
                  >
                    {fieldErrors.username}
                  </span>
                )}
              </label>
            </>
          )}

          <label>
            Correo
            <input
              data-testid="auth-email-input"
              type="email"
              required
              autoComplete="email"
              aria-invalid={!!fieldErrors.email}
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                setFieldErrors((f) => ({ ...f, email: "" }));
              }}
              onBlur={checkEmail}
            />
            {fieldErrors.email && (
              <span
                className="field-error"
                role="alert"
                data-testid="auth-email-error"
              >
                {fieldErrors.email}
              </span>
            )}
          </label>

          <label>
            Contraseña
            <input
              data-testid="auth-password-input"
              type="password"
              required
              minLength={mode === "register" ? 6 : undefined}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              aria-invalid={!!fieldErrors.password}
              value={form.password}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value });
                setFieldErrors((f) => ({ ...f, password: "" }));
              }}
            />
            {fieldErrors.password && (
              <span className="field-error" role="alert">
                {fieldErrors.password}
              </span>
            )}
          </label>

          {mode === "register" && (
            <>
              <label>
                Rol
                <select
                  data-testid="register-role-select"
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value })
                  }
                >
                  <option value="student">Estudiante</option>
                  <option value="monitor">Monitor</option>
                  <option value="professor">Profesor</option>
                </select>
                {fieldErrors.role && (
                  <span className="field-error" role="alert">
                    {fieldErrors.role}
                  </span>
                )}
              </label>

              <label>
                Programa
                <select
                  data-testid="register-program-select"
                  value={form.program}
                  onChange={(e) =>
                    setForm({ ...form, program: e.target.value })
                  }
                >
                  {PROGRAM_NAMES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                {fieldErrors.program && (
                  <span className="field-error" role="alert">
                    {fieldErrors.program}
                  </span>
                )}
              </label>

              {form.role === "student" && (
                <label>
                  Semestre
                  <select
                    data-testid="register-semester-select"
                    value={form.semester}
                    aria-invalid={!!fieldErrors.semester}
                    onChange={(e) =>
                      setForm({ ...form, semester: e.target.value })
                    }
                  >
                    {SEMESTERS.map((s) => (
                      <option key={s} value={s}>
                        {s}° semestre
                      </option>
                    ))}
                  </select>
                  {fieldErrors.semester && (
                    <span className="field-error" role="alert">
                      {fieldErrors.semester}
                    </span>
                  )}
                </label>
              )}
            </>
          )}

          {notice && (
            <div
              className="auth-notice"
              role="status"
              data-testid="auth-notice"
            >
              <CheckCircle2 size={15} aria-hidden="true" /> {notice}
            </div>
          )}

          {error && (
            <div
              className="error"
              role="alert"
              data-testid="auth-error"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary wide"
            data-testid="auth-submit-button"
            disabled={busy}
          >
            {mode === "register" ? "Crear mi cuenta" : "Iniciar sesión"}
            <ArrowRight size={17} />
          </button>

          <div className="auth-links">
            <Link
              to="/recuperar-contrasena"
              className="link"
              data-testid="forgot-password-button"
              aria-disabled={busy}
              onClick={(e) => {
                if (busy) e.preventDefault();
              }}
            >
              ¿Olvidaste tu contraseña?
            </Link>

            <button
              type="button"
              className="link"
              data-testid="toggle-auth-mode"
              onClick={() => {
                setMode(mode === "register" ? "login" : "register");
                setError("");
                setNotice("");
                setFieldErrors({});
              }}
              disabled={busy}
            >
              {mode === "register" ? "Ya tengo cuenta" : "Crear una cuenta"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}