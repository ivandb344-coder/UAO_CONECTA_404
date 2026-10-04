import { useState } from "react";
import { Mail, Video, MessagesSquare, BookOpen, MessageCircle, GraduationCap, ExternalLink, Pencil } from "lucide-react";
import { useViewMode } from "@/lib/viewMode";
import { TOOLS, CATEGORIES, loadLinks, saveLinks } from "@/lib/integrationLinks";
import EditLinksModal from "@/components/hub/EditLinksModal";

const ICONS = {
  gmail: Mail,
  teams: Video,
  piazza: MessagesSquare,
  moodle: BookOpen,
  whatsapp: MessageCircle,
  banner: GraduationCap,
};

/* Ecosistema de herramientas: 6 plataformas en 3 categorías, con URLs por defecto oficiales
   (editables por docentes/monitores y persistidas en localStorage). */
export default function EcosystemLayer() {
  const { viewRole } = useViewMode();
  const canEdit = viewRole !== "student";
  const [links, setLinks] = useState(loadLinks);
  const [editOpen, setEditOpen] = useState(false);

  const handleSave = (next) => {
    saveLinks(next);
    setLinks(next);
    setEditOpen(false);
  };

  return (
    <section className="ecosystem-layer" aria-labelledby="ecosystem-title" data-testid="ecosystem-layer">
      <div className="section-title">
        <div>
          <p className="eyebrow">ECOSISTEMA DE HERRAMIENTAS</p>
          <h3 id="ecosystem-title">Comunicación, foros y soporte en un mismo lugar</h3>
        </div>
        {canEdit && (
          <button className="edit-links-btn" onClick={() => setEditOpen(true)} data-testid="integration-edit-links">
            <Pencil size={14} aria-hidden="true" /> Editar enlaces
          </button>
        )}
      </div>

      {CATEGORIES.map((cat) => {
        const tools = TOOLS.filter((t) => t.category === cat.id);
        return (
          <div className="eco-category" key={cat.id} data-testid={`eco-group-${cat.id}`}>
            <h4 className="eco-cat-head">{cat.label}</h4>
            <div className="ecosystem-grid">
              {tools.map((tool) => {
                const Icon = ICONS[tool.key] || ExternalLink;
                const url = links[tool.key];
                return (
                  <article
                    className="eco-card"
                    key={tool.key}
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
                      <span className="eco-status on" data-testid={`eco-status-${tool.key}`}>
                        <i aria-hidden="true" /> Disponible
                      </span>
                      <a
                        className="eco-cta"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`eco-open-${tool.key}`}
                      >
                        Abrir <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    </footer>
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}

      <EditLinksModal open={editOpen} links={links} onSave={handleSave} onClose={() => setEditOpen(false)} />
    </section>
  );
}
