import { useViewMode } from "@/lib/viewMode";

/* Toggle reversible (heurística 3: control y libertad). Solo para estudiantes. */
export default function MonitorToggle({ compact = false }) {
  const { canToggle, monitorMode, setMonitorMode } = useViewMode();
  if (!canToggle) return null;
  return (
    <div className={`monitor-toggle ${compact ? "compact" : ""}`} data-testid="monitor-toggle-wrap">
      <div className="monitor-toggle-text">
        <b>Modo Monitor</b>
        {!compact && <span>{monitorMode ? "Ves la interfaz como monitor: revisiones y agenda." : "Cambia a la vista de monitor cuando apoyes una asignatura."}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={monitorMode}
        aria-label="Activar Modo Monitor"
        className="switch-btn"
        onClick={() => setMonitorMode(!monitorMode)}
        data-testid="monitor-mode-toggle"
      />
    </div>
  );
}
