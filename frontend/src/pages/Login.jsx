import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function startGoogleAuth() {
  const redirect = window.location.origin + "/inicio";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
}

export default function Login({ onLogin, initialError = "" }) {
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
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api.post(mode === "register" ? "/auth/register" : "/auth/login", form);
      localStorage.setItem("uao_token", r.data.token);
      onLogin(r.data.user);
    } catch (x) {
      const detail = x.response?.data?.detail;
      if (detail?.fields) setError(Object.values(detail.fields).join(" "));
      else setError(typeof detail === "string" ? detail : "No pudimos iniciar sesión");
    }
    setBusy(false);
  };

  const demo = async (role = "student") => {
    setBusy(true);
    setError("");
    try {
      const path = role === "student" ? "/auth/demo" : "/auth/demo-advisor";
      const r = await api.post(path);
      localStorage.setItem("uao_token", r.data.token);
      onLogin(r.data.user);
    } catch (x) {
      const detail = x.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "No pudimos iniciar la sesión demo.");
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
          <p className="auth-copy">Personas, respuestas y apoyo académico en un solo lugar.</p>
        </div>
        <div className="quote">“Siempre hay alguien que sabe cómo ayudarte.”</div>
      </div>

      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <div className="brand-mobile brand-mark">
            UAO <span>Conecta</span>
          </div>
          <p className="eyebrow">{mode === "register" ? "CREA TU PERFIL" : "BIENVENIDO DE NUEVO"}</p>
          <h2>{mode === "register" ? "Únete a tu comunidad académica" : "Entra a tu espacio"}</h2>
          <p className="muted">
            {mode === "register"
              ? "Tu perfil te conecta con personas y oportunidades."
              : "Todo lo que necesitas para seguir avanzando."}
          </p>

          {/* Highlighted Google — always visible at the top */}
          <button
            type="button"
            className="google featured"
            data-testid="google-login-button"
            onClick={startGoogleAuth}
          >
            <span className="g-icon" aria-hidden="true">G</span>
            <span>Continuar con Google</span>
          </button>
          <div className="or-divider" aria-hidden="true"><span>o con tu correo</span></div>

          {mode === "register" && (
            <>
              <label>
                Nombre completo
                <input
                  data-testid="register-name-input"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Usuario
                <input
                  data-testid="register-username-input"
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </label>
            </>
          )}

          <label>
            Correo
            <input
              data-testid="auth-email-input"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Contraseña
            <input
              data-testid="auth-password-input"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>

          {mode === "register" && (
            <>
              <label>
                Rol
                <select
                  data-testid="register-role-select"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="student">Estudiante</option>
                  <option value="monitor">Monitor</option>
                  <option value="professor">Profesor</option>
                </select>
              </label>
              <label>
                Programa
                <select
                  data-testid="register-program-select"
                  value={form.program}
                  onChange={(e) => setForm({ ...form, program: e.target.value })}
                >
                  <option>Ingeniería Informática</option>
                  <option>Ingeniería de Datos e Inteligencia Artificial</option>
                  <option>Ingeniería Multimedia</option>
                  <option>Ingeniería Industrial</option>
                  <option>Ingeniería Mecatrónica</option>
                  <option>Ingeniería de Manufactura</option>
                  <option>Ingeniería Mecánica</option>
                  <option>Ingeniería Eléctrica</option>
                  <option>Ingeniería Electrónica y Telecomunicaciones</option>
                  <option>Ingeniería Biomédica</option>
                  <option>Ingeniería Ambiental</option>
                </select>
              </label>
            </>
          )}

          {error && (
            <div className="error" data-testid="auth-error">
              {error}
            </div>
          )}
          <button className="primary wide" data-testid="auth-submit-button" disabled={busy}>
            {mode === "register" ? "Crear mi cuenta" : "Iniciar sesión"} <ArrowRight size={17} />
          </button>

          <div className="auth-links">
            <button
              type="button"
              className="link"
              data-testid="forgot-password-button"
              onClick={() =>
                setError("Enviaremos un correo con las instrucciones al email registrado.")
              }
            >
              ¿Olvidaste tu contraseña?
            </button>
            <button
              type="button"
              className="link"
              data-testid="toggle-auth-mode"
              onClick={() => {
                setMode(mode === "register" ? "login" : "register");
                setError("");
              }}
            >
              {mode === "register" ? "Ya tengo cuenta" : "Crear una cuenta"}
            </button>
          </div>

          <div className="auth-demo-row">
            <button
              type="button"
              className="demo"
              data-testid="demo-login-button"
              onClick={() => demo("student")}
            >
              Demo estudiante
            </button>
            <button
              type="button"
              className="demo"
              data-testid="demo-advisor-button"
              onClick={() => demo("monitor")}
            >
              Demo monitor
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
