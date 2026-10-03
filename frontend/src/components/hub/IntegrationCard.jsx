import { ExternalLink, RefreshCw } from "lucide-react";

const MARK = { moodle: "M", teams: "T", banner: "B" };

const syncedLabel = (iso) => {
  if (!iso) return "sin sincronizar";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return minutes < 1 ? "hace un momento" : `hace ${minutes} min`;
};

/* Widget de un sistema externo (Moodle / Teams / Banner). Botón de acción con affordance alto. */
export default function IntegrationCard({ system, index = 0 }) {
  return (
    <article
      className={`integration-card sys-${system.key}`}
      style={{ "--sys": system.color, animationDelay: `${index * 90}ms` }}
      data-testid={`integration-card-${system.key}`}
      aria-label={`Integración con ${system.name}`}
    >
      <header className="integration-head">
        <span className="sys-mark" aria-hidden="true">{MARK[system.key]}</span>
        <div>
          <b>{system.name}</b>
          <small>{system.description}</small>
        </div>
        <span className={`sys-status ${system.status}`} data-testid={`integration-status-${system.key}`}>
          <i aria-hidden="true" /> {system.status === "connected" ? "Conectado" : "Sin conexión"}
        </span>
      </header>
      <ul className="integration-items">
        {system.items.map((item) => (
          <li key={item.label} className={`kind-${item.kind}`} data-testid={`integration-item-${system.key}-${item.kind}`}>
            <span className="item-value">{item.value}</span>
            <span className="item-text">
              <b>{item.label}</b>
              <small>{item.detail}</small>
            </span>
          </li>
        ))}
      </ul>
      <footer className="integration-foot">
        <small><RefreshCw size={11} aria-hidden="true" /> Sincronizado {syncedLabel(system.synced_at)}</small>
        <a
          className="sys-cta"
          href={system.cta.url}
          target="_blank"
          rel="noreferrer"
          data-testid={`integration-open-${system.key}`}
        >
          {system.cta.label} <ExternalLink size={13} aria-hidden="true" />
        </a>
      </footer>
    </article>
  );
}
