import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

export default function Login({ onLogin }) {
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "student",
    program: "Ingeniería Informática",
    semester: 3,
  });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post(register ? "/auth/register" : "/auth/login", form);
      localStorage.setItem("uao_token", r.data.token);
      onLogin(r.data.user);
    } catch (x) {
      setError(x.response?.data?.detail || "No pudimos iniciar sesión");
    }
  };

  const demo = async (role = "student") => {
    const path = role === "student" ? "/auth/demo" : "/auth/demo-advisor";
    const r = await api.post(path);
    localStorage.setItem("uao_token", r.data.token);
    onLogin(r.data.user);
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
          <p className="auth-copy">Encuentra personas, respuestas y espacios para avanzar con confianza.</p>
        </div>
        <div className="quote">“Siempre hay alguien que sabe cómo ayudarte.”</div>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <div className="brand-mobile brand-mark">
          UAO <span>Conecta</span>
        </div>
        <p className="eyebrow">{register ? "CREA TU PERFIL" : "BIENVENIDO DE NUEVO"}</p>
        <h2>{register ? "Únete a tu comunidad académica" : "Entra a tu espacio"}</h2>
        <p className="muted">
          {register ? "Tu perfil te conecta con personas y oportunidades." : "Todo lo que necesitas para seguir avanzando."}
        </p>
        {register && (
          <>
            <label>
              Nombre completo
              <input data-testid="register-name-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Usuario
              <input data-testid="register-username-input" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </label>
          </>
        )}
        <label>
          Correo institucional
          <input data-testid="auth-email-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          Contraseña
          <input data-testid="auth-password-input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        {register && (
          <>
            <label>
              Rol
              <select data-testid="register-role-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="student">Estudiante</option>
                <option value="monitor">Monitor</option>
                <option value="professor">Profesor</option>
              </select>
            </label>
            <label>
              Programa
              <select data-testid="register-program-select" value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })}>
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
        <button className="primary wide" data-testid="auth-submit-button">
          {register ? "Crear mi cuenta" : "Iniciar sesión"} <ArrowRight size={17} />
        </button>
        <button
          type="button"
          className="google"
          data-testid="google-login-button"
          onClick={() => setError("Google Login requiere configurar el dominio institucional.")}
        >
          G <span>Continuar con Google</span>
        </button>
        <button type="button" className="demo" data-testid="demo-login-button" onClick={() => demo("student")}>
          Entrar con cuenta demo (estudiante)
        </button>
        <button type="button" className="demo" data-testid="demo-advisor-button" onClick={() => demo("monitor")}>
          Entrar con cuenta demo (monitor)
        </button>
        <p className="switch">
          {register ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
          <button type="button" onClick={() => setRegister(!register)} data-testid="toggle-auth-mode">
            {register ? "Inicia sesión" : "Regístrate"}
          </button>
        </p>
      </form>
    </main>
  );
}
