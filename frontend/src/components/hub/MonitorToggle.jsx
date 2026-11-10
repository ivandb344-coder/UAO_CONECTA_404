import { useViewMode } from "../../lib/viewMode";
import { useState } from "react";

/* Toggle reversible (heurística 3: control y libertad). Solo para estudiantes. */
export default function MonitorToggle({ compact = false, mobileNav = false }) {
  const { canToggle, monitorMode, setMonitorMode } = useViewMode();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!canToggle) return null;
  const requestModeChange = () => {
    if (!monitorMode) setConfirmOpen(true);
    else changeMode(false);
  };
  const changeMode = async (enabled) => {
    setSaving(true);
    setError("");
    try {
      await setMonitorMode(enabled);
      setConfirmOpen(false);
    } catch {
      setError("No pudimos activar el modo Monitor. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
    <div className={`monitor-toggle ${compact ? "compact" : ""} ${mobileNav ? "mobile-nav-monitor-toggle" : ""}`} data-testid={mobileNav ? "mobile-monitor-toggle-wrap" : "monitor-toggle-wrap"}>
      <div className="monitor-toggle-text">
        <b>Modo Monitor</b>
        {!compact && <span>{monitorMode ? "Gestiona tus espacios de apoyo y las solicitudes de asesoría." : "Actívalo si dominas un tema y quieres apoyar a compañeros que necesitan ayuda."}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={monitorMode}
        aria-label={monitorMode ? "Desactivar modo Monitor" : "Activar modo Monitor"}
        className="switch-btn"
        onClick={requestModeChange}
        disabled={saving}
        data-testid={mobileNav ? "mobile-monitor-mode-toggle" : "monitor-mode-toggle"}
      />
    </div>
    {error && <p className="error monitor-toggle-error" role="alert">{error}</p>}
    {confirmOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmOpen(false); }}><section className="modal monitor-confirm" role="dialog" aria-modal="true" aria-labelledby="monitor-confirm-title" data-testid="monitor-mode-confirmation"><button type="button" className="close" aria-label="Cerrar confirmación" onClick={() => setConfirmOpen(false)}>×</button><p className="eyebrow">APOYO ENTRE COMPAÑEROS</p><h2 id="monitor-confirm-title">¿Activar la vista Monitor?</h2><p className="modal-detail"><span className="monitor-confirm-copy-desktop">Úsala cuando domines un tema y quieras ayudar a compañeros que tienen dudas. En este espacio puedes actuar como un “docente” para tus pares: comparte información correcta y trata a todos con respeto. Tu rol institucional sigue siendo estudiante; activar el modo habilita publicar y gestionar tus propios espacios de asesoría y aparecer en reconocimientos por respuestas útiles.</span><span className="monitor-confirm-copy-mobile">Actívala si dominas un tema y quieres apoyar a tus compañeros. Podrás crear asesorías, responder dudas y recibir reconocimientos. Comparte información correcta y trata a todos con respeto. Tu rol institucional seguirá siendo estudiante.</span></p><div className="form-actions"><button type="button" className="ghost" disabled={saving} onClick={() => setConfirmOpen(false)}>Cancelar</button><button type="button" className="primary" disabled={saving} onClick={() => changeMode(true)}>{saving ? "Activando…" : "Activar modo Monitor"}</button></div></section></div>}
    </>
  );
}
