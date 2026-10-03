import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

export const SYNC_STEPS = [
  { key: "identity", label: "Verificando identidad institucional" },
  { key: "moodle", label: "Conectando con Moodle" },
  { key: "teams", label: "Conectando con Teams" },
  { key: "banner", label: "Consultando Banner" },
];
export const SYNC_DURATION = SYNC_STEPS.length * 420 + 200;

/* Simula el "arrastre de datos" desde los sistemas UAO mientras el backend autentica. */
export default function SyncOverlay({ active, name }) {
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (!active) { setDone(0); return undefined; }
    const timers = SYNC_STEPS.map((_, i) => setTimeout(() => setDone(i + 1), (i + 1) * 420));
    return () => timers.forEach(clearTimeout);
  }, [active]);

  if (!active) return null;
  return (
    <div className="sync-overlay" role="status" aria-live="polite" data-testid="sync-overlay">
      <div className="sync-card">
        <p className="eyebrow">CONECTANDO CON LOS SISTEMAS UAO</p>
        <h2>{name ? `Hola, ${name}.` : "Un momento…"}</h2>
        <ol className="sync-steps">
          {SYNC_STEPS.map((s, i) => {
            const state = i < done ? "done" : i === done ? "active" : "pending";
            return (
              <li key={s.key} className={state} data-testid={`sync-step-${s.key}`}>
                <span className="sync-icon" aria-hidden="true">
                  {state === "done" ? <Check size={13} /> : state === "active" ? <Loader2 size={13} className="spin" /> : null}
                </span>
                {s.label}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
