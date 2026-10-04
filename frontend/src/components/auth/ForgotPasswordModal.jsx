import { useState } from "react";
import { X, Mail, ShieldCheck, Clock, ArrowLeft, Send } from "lucide-react";

const INSTITUTIONAL_RE = /@uao\.edu\.co$/i;
const RESET_TOKEN = "UAO-2026-RESTORE-SECURE";

/* Flujo de recuperación de contraseña en modal:
   1) Captura de correo institucional con validación en tiempo real (@uao.edu.co).
   2) Vista previa del correo institucional "enviado" (plantilla UAO + token simulado). */
export default function ForgotPasswordModal({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const clean = email.trim().toLowerCase();
  const valid = INSTITUTIONAL_RE.test(clean);
  const showError = touched && !valid;

  const close = () => {
    setEmail("");
    setTouched(false);
    setSent(false);
    onClose();
  };

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    setSent(true);
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

        {!sent ? (
          <form onSubmit={submit} noValidate data-testid="forgot-form">
            <span className="fp-icon" aria-hidden="true"><Mail size={20} /></span>
            <p className="eyebrow">RECUPERAR CONTRASEÑA</p>
            <h2>¿Olvidaste tu contraseña?</h2>
            <p className="muted">
              Escribe tu correo institucional y te enviaremos un enlace seguro para crear una contraseña nueva.
            </p>

            <label>
              Correo institucional
              <input
                type="email"
                autoFocus
                autoComplete="email"
                placeholder="nombre@uao.edu.co"
                value={email}
                aria-invalid={showError}
                data-testid="forgot-email-input"
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (!touched) setTouched(true);
                }}
              />
            </label>
            {showError && (
              <span className="field-error" role="alert" data-testid="forgot-email-error">
                El correo debe terminar en @uao.edu.co.
              </span>
            )}

            <button type="submit" className="primary wide" disabled={!valid} data-testid="forgot-submit">
              Enviar enlace <Send size={16} aria-hidden="true" />
            </button>

            <div className="auth-links">
              <button type="button" className="link" onClick={close} data-testid="forgot-back-login">
                <ArrowLeft size={13} aria-hidden="true" /> Volver a iniciar sesión
              </button>
            </div>
          </form>
        ) : (
          <div className="fp-sent" data-testid="forgot-email-preview">
            <div className="fp-success">
              <ShieldCheck size={16} aria-hidden="true" /> Enlace de recuperación enviado
            </div>

            <article className="email-preview" aria-label="Vista previa del correo enviado">
              <header className="email-head">
                <div className="email-brand">UAO <span>Conecta</span></div>
                <p>Universidad Autónoma de Occidente</p>
              </header>
              <div className="email-body">
                <dl className="email-meta">
                  <div><dt>Para</dt><dd data-testid="forgot-preview-recipient">{clean}</dd></div>
                  <div><dt>Asunto</dt><dd>Restablece tu contraseña · UAO Conecta</dd></div>
                </dl>
                <p className="email-text">
                  Hola, recibimos una solicitud para restablecer la contraseña de tu cuenta institucional.
                  Usa el siguiente enlace seguro para continuar:
                </p>
                <div className="email-token" data-testid="forgot-preview-token">
                  <small>Token de recuperación</small>
                  <code>{RESET_TOKEN}</code>
                </div>
                <p className="email-expire">
                  <Clock size={13} aria-hidden="true" /> Este enlace expira en 15 minutos por tu seguridad.
                </p>
                <p className="email-foot">
                  Si no solicitaste este cambio, ignora este mensaje: tu contraseña seguirá igual.
                </p>
              </div>
            </article>

            <button type="button" className="primary wide" onClick={close} data-testid="forgot-done">
              <ArrowLeft size={15} aria-hidden="true" /> Volver a iniciar sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
