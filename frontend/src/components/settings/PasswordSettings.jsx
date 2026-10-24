import { useState } from "react";
import { KeyRound, ShieldCheck, ArrowRight, RefreshCw } from "lucide-react";
import { api, API } from "@/lib/api";

function startGoogleReauthentication() {
  const cleanPath = window.location.pathname.replace(/index\.html$/, "");
  const redirect = `${window.location.origin}${cleanPath}`;
  window.location.href = `${API}/auth/google/login?redirect=${encodeURIComponent(redirect)}`;
}

export default function PasswordSettings({ user }) {
  const [hasPassword, setHasPassword] = useState(
    user.has_password ?? user.auth_provider !== "google",
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reauthRequired, setReauthRequired] = useState(false);
  const requiresGoogleVerification = user.auth_provider === "google";

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setReauthRequired(false);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      const response = await api.post("/auth/set-password", {
        password,
        ...(hasPassword && !requiresGoogleVerification ? { current_password: currentPassword } : {}),
      });
      setHasPassword(true);
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setNotice(response.data?.message || "La contraseña de UAO Conecta quedó guardada.");
    } catch (requestError) {
      const detail = requestError.response?.data?.detail;
      const message = typeof detail === "string"
        ? detail
        : "No pudimos guardar la contraseña. Inténtalo nuevamente.";
      setError(message);
      setReauthRequired(message.toLowerCase().includes("vuelve a iniciar sesión con google"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="settings-section" aria-labelledby="password-heading" data-testid="password-settings">
      <p className="eyebrow">ACCESO MANUAL</p>
      <h2 id="password-heading">{hasPassword ? "Cambiar contraseña de UAO Conecta" : "Crear contraseña para UAO Conecta"}</h2>
      <p>
        Esta contraseña sirve solo para ingresar a UAO Conecta. No cambia ni reemplaza la contraseña de Google, CampusDigital o Moodle.
      </p>

      {requiresGoogleVerification && (
        <div className="password-help" role="note">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Tu cuenta se creó con Google. Vuelve a verificar esa cuenta para crear o cambiar aquí una contraseña propia para el ingreso manual.</span>
        </div>
      )}

      <form className="settings-password-form" onSubmit={submit} noValidate>
        {hasPassword && !requiresGoogleVerification && (
          <label>
            Contraseña actual
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              disabled={busy}
            />
          </label>
        )}
        <label>
          {hasPassword ? "Nueva contraseña" : "Contraseña"}
          <input
            type="password"
            autoComplete="new-password"
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={busy}
          />
        </label>
        <label>
          Confirmar contraseña
          <input
            type="password"
            autoComplete="new-password"
            minLength={6}
            placeholder="Escríbela de nuevo"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            disabled={busy}
          />
        </label>

        {error && <div className="error" role="alert" data-testid="password-settings-error">{error}</div>}
        {notice && <div className="auth-notice" role="status" data-testid="password-settings-notice"><ShieldCheck size={15} aria-hidden="true" /> {notice}</div>}

        <div className="password-settings-actions">
          <button type="submit" className="primary" disabled={busy} data-testid="password-settings-submit">
            <KeyRound size={15} aria-hidden="true" /> {busy ? "Guardando…" : hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
          </button>
          {reauthRequired && (
            <button type="button" className="ghost" onClick={startGoogleReauthentication} data-testid="password-settings-google-reauth">
              <RefreshCw size={15} aria-hidden="true" /> Verificar con Google
            </button>
          )}
        </div>
        {requiresGoogleVerification && <p className="field-hint"><ArrowRight size={13} aria-hidden="true" /> Si la sesión de Google venció, vuelve a verificarte con Google y regresa aquí.</p>}
      </form>
    </section>
  );
}
