import { useEffect, useState } from "react";
import { X, Mail, ShieldCheck, ArrowLeft, Send, Loader2, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UAO_PASSWORD_HELP_URL = "https://campus.uaovirtual.edu.co/login/forgot_password.php";

/* La recuperación usa el servicio real; no se muestran tokens simulados en el cliente. */
export default function ForgotPasswordModal({ open, initialEmail = "", onClose }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setError("");
      setMessage("");
    }
  }, [open, initialEmail]);

  if (!open) return null;

  const clean = email.trim().toLowerCase();
  const valid = EMAIL_RE.test(clean);

  const close = () => {
    if (loading) return;
    setError("");
    setMessage("");
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!valid) {
      setError("Escribe un correo electrónico válido.");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/auth/forgot-password", { email: clean });
      setMessage(response.data?.message || "Si existe una cuenta asociada a este correo, recibirás un enlace para recuperar tu contraseña.");
    } catch (err) {
      const detail = err.response?.data?.detail;
      const unavailable = err.response?.status === 503;
      setError(unavailable
        ? "UAO Conecta no pudo enviar el enlace: el servidor aún no tiene habilitado el servicio de correo. La recuperación oficial de UAO Virtual que aparece abajo cambia la clave institucional, no la de UAO Conecta."
        : typeof detail === "string" ? detail : "No se pudo procesar la solicitud. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop fp-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Recuperar contraseña"
      data-testid="forgot-modal"
      onClick={close}
    >
      <div className="modal fp-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="close" aria-label="Cerrar" data-testid="forgot-modal-close" onClick={close}>
          <X size={18} aria-hidden="true" />
        </button>

        {!message ? (
          <form onSubmit={submit} noValidate data-testid="forgot-form">
            <span className="fp-icon" aria-hidden="true"><Mail size={20} /></span>
            <p className="eyebrow">RECUPERAR CONTRASEÑA</p>
            <h2>¿Olvidaste tu contraseña?</h2>
            <p className="muted">
              Restablece aquí la contraseña propia de UAO Conecta. Si tu cuenta se creó con Google, usa esa opción para entrar y crea una clave manual desde Configuración.
            </p>

            <label>
              Correo asociado a tu cuenta
              <input
                type="email"
                autoFocus
                autoComplete="email"
                placeholder="nombre@uao.edu.co"
                value={email}
                aria-invalid={!!error}
                aria-describedby={error ? "forgot-email-error" : undefined}
                data-testid="forgot-email-input"
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                disabled={loading}
              />
            </label>
            {error && (
              <div id="forgot-email-error" className="error" role="alert" data-testid="forgot-email-error">
                {error}
              </div>
            )}

            <button type="submit" className="primary wide" disabled={!valid || loading} data-testid="forgot-submit">
              {loading ? "Enviando…" : "Enviar enlace"} {loading ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
            </button>

            <div className="auth-links">
              <button type="button" className="link" onClick={close} disabled={loading} data-testid="forgot-back-login">
                <ArrowLeft size={13} aria-hidden="true" /> Volver a iniciar sesión
              </button>
            </div>
            <div className="recovery-help" data-testid="campus-password-help">
              <b>¿Olvidaste la clave de CampusDigital o UAO Virtual?</b>
              <p>El sitio oficial restablece la clave institucional. Para la clave de UAO Conecta, el servidor debe tener habilitado el envío de correo.</p>
              <a href={UAO_PASSWORD_HELP_URL} target="_blank" rel="noopener noreferrer">
                Recuperar contraseña de UAO Virtual <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          </form>
        ) : (
          <div className="fp-sent" data-testid="forgot-email-preview">
            <div className="fp-success" role="status">
              <ShieldCheck size={16} aria-hidden="true" /> Solicitud procesada
            </div>
            <p className="muted" data-testid="forgot-success-message">{message}</p>

            <button type="button" className="primary wide" onClick={close} data-testid="forgot-done">
              <ArrowLeft size={15} aria-hidden="true" /> Volver a iniciar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
