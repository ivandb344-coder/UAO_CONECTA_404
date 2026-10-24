import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

const UAO_PASSWORD_HELP_URL = "https://campus.uaovirtual.edu.co/login/forgot_password.php";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Escribe tu correo electrónico.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/auth/forgot-password",
        {
          email: cleanEmail,
        }
      );

      setMessage(
        response.data?.message ||
          "Si existe una cuenta asociada a este correo, recibirás un enlace para recuperar tu contraseña."
      );

      setEmail("");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(err.response?.status === 503
        ? "El servidor de UAO Conecta no tiene habilitado el envío de correo, así que no puede enviar este enlace. La página oficial de UAO Virtual de abajo solo restablece la contraseña institucional."
        : typeof detail === "string"
          ? detail
          : "No se pudo procesar la solicitud. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth">
      <div className="auth-visual">
        <div className="brand-mark">
          UAO <span>Conecta</span>
        </div>

        <div>
          <p className="eyebrow">
            RECUPERA TU ACCESO
          </p>

          <h1>
            Vuelve a tu
            <br />
            <em>espacio.</em>
          </h1>

          <p className="auth-copy">
            Te ayudaremos a recuperar el acceso a tu cuenta de UAO Conecta.
          </p>
        </div>

        <div className="quote">
          “Tu espacio académico siempre está contigo.”
        </div>
      </div>

      <div className="auth-form-wrap">
        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <div className="brand-mobile brand-mark">
            UAO <span>Conecta</span>
          </div>

          <p className="eyebrow">
            RECUPERAR CONTRASEÑA
          </p>

          <h2>
            ¿Olvidaste tu contraseña?
          </h2>

          <p className="muted">
            Escribe el correo asociado a tu cuenta de UAO Conecta. El servidor debe tener habilitado el correo para enviarte un enlace.
          </p>

          <label>
            Correo electrónico

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              required
              disabled={loading}
            />
          </label>

          {error && (
            <div
              className="error"
              role="alert"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              className="auth-notice"
              role="status"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            className="primary wide"
            disabled={loading}
          >
            {loading
              ? "Enviando..."
              : "Recuperar contraseña"}
          </button>

          <div className="auth-links">
            <Link
              to="/"
              className="link"
            >
              ← Volver a iniciar sesión
            </Link>
          </div>

          <div className="recovery-help" data-testid="campus-password-help">
            <b>¿Olvidaste la clave de CampusDigital o UAO Virtual?</b>
            <p>Recupérala en el sitio oficial. Esa clave institucional no cambia la contraseña propia de UAO Conecta.</p>
            <a href={UAO_PASSWORD_HELP_URL} target="_blank" rel="noopener noreferrer">
              Recuperar contraseña de UAO Virtual <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}

