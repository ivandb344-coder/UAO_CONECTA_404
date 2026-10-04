import { useState } from "react";
import { Mail, MessagesSquare, MessageCircle, ExternalLink, Plug, Boxes } from "lucide-react";

const ICONS = { gmail: Mail, piazza: MessagesSquare, whatsapp: MessageCircle };
const FALLBACK_ICON = Boxes;

/* Ecosistema de herramientas complementarias, agrupadas por categoría.
   Comunicación oficial · Foros académicos · Soporte & contacto directo. */
export default function EcosystemLayer({ ecosystem = [] }) {
  const [connected, setConnected] = useState({});

  if (!ecosystem.length) return null;

  const isConnected = (tool) => tool.status === "synced" || connected[tool.key];

  return (
    <section className="ecosystem-layer" aria-labelledby="ecosystem-title" data-testid="ecosystem-layer">
      <div className="section-title">
        <div>
          <p className="eyebrow">ECOSISTEMA DE HERRAMIENTAS</p>
          <h3 id="ecosystem-title">Comunicación, foros y soporte en un mismo lugar</h3>
        </div>
      </div>

      <div className="ecosystem-grid">
        {ecosystem.map((tool) => {
          const Icon = ICONS[tool.key] || FALLBACK_ICON;
          const online = isConnected(tool);
          return (
            <article
              key={tool.key}
              className="eco-card"
              style={{ "--sys": tool.color }}
              data-testid={`eco-card-${tool.key}`}
              aria-label={`${tool.name} · ${tool.category_label}`}
            >
              <span className="eco-cat" data-testid={`eco-category-${tool.key}`}>{tool.category_label}</span>
              <header className="eco-head">
                <span className="eco-mark" aria-hidden="true"><Icon size={18} /></span>
                <div>
                  <b>{tool.name}</b>
                  <small>{tool.description}</small>
                </div>
              </header>
              <footer className="eco-foot">
                <span className={`eco-status ${online ? "on" : "off"}`} data-testid={`eco-status-${tool.key}`}>
                  <i aria-hidden="true" /> {online ? "Sincronizado" : "Disponible"}
                </span>
                {online ? (
                  <a
                    className="eco-cta"
                    href={tool.cta.url}
                    target="_blank"
                    rel="noreferrer"
                    data-testid={`eco-open-${tool.key}`}
                  >
                    Abrir <ExternalLink size={13} aria-hidden="true" />
                  </a>
                ) : (
                  <button
                    type="button"
                    className="eco-cta connect"
                    onClick={() => setConnected((c) => ({ ...c, [tool.key]: true }))}
                    data-testid={`eco-connect-${tool.key}`}
                  >
                    <Plug size={13} aria-hidden="true" /> Conectar
                  </button>
                )}
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}
