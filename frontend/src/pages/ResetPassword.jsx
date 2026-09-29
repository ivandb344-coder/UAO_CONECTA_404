import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "@/lib/api";

export default function ResetPassword() {
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!token) {
      setError(
        "El enlace de recuperación no es válido o está incompleto."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "La contraseña debe tener al menos 8 caracteres."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/auth/reset-password",
        {
          token,
          password,
        }
      );

      setMessage(
        response.data?.message ||
          "Contraseña actualizada correctamente."
      );

      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "No se pudo cambiar la contraseña. Inténtalo nuevamente."
      );
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
            Crea una
            <br />
            <em>nueva contraseña.</em>
          </h1>

          <p className="auth-copy">
            Configura una nueva contraseña para volver a ingresar a UAO Conecta.
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
            NUEVA CONTRASEÑA
          </p>

          <h2>
            Restablecer contraseña
          </h2>

          <p className="muted">
            Escribe una nueva contraseña para tu cuenta.
          </p>

          <label>
            Nueva contraseña

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="new-password"
              minLength={8}
              required
              disabled={loading}
              placeholder="Mínimo 8 caracteres"
            />
          </label>

          <label>
            Confirmar contraseña

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              autoComplete="new-password"
              minLength={8}
              required
              disabled={loading}
              placeholder="Repite tu contraseña"
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
            disabled={loading || !token}
          >
            {loading
              ? "Guardando..."
              : "Guardar nueva contraseña"}
          </button>

          <div className="auth-links">
            <Link
              to="/"
              className="link"
            >
              ← Volver a iniciar sesión
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
