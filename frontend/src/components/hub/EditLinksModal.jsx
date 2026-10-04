import { useEffect, useState } from "react";
import { X, Link2, RotateCcw, Save } from "lucide-react";
import { TOOLS, DEFAULT_LINKS } from "@/lib/integrationLinks";

const isValidUrl = (v) => /^https?:\/\/.+/i.test((v || "").trim());

/* Modal para que docentes/monitores editen las URLs de las 6 plataformas.
   Guarda en localStorage (vía onSave del padre). */
export default function EditLinksModal({ open, links, onSave, onClose }) {
  const [form, setForm] = useState(links);

  useEffect(() => {
    if (open) setForm(links);
  }, [open, links]);

  if (!open) return null;

  const invalid = TOOLS.some((t) => !isValidUrl(form[t.key]));
  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const resetDefaults = () => setForm({ ...DEFAULT_LINKS });

  const submit = (e) => {
    e.preventDefault();
    if (invalid) return;
    onSave({ ...form });
  };

  return (
    <div
      className="modal-backdrop fp-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Editar enlaces de integración"
      data-testid="edit-links-modal"
      onClick={onClose}
    >
      <div className="modal edit-links" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="close" aria-label="Cerrar" data-testid="edit-links-close" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
        <span className="fp-icon" aria-hidden="true"><Link2 size={20} /></span>
        <p className="eyebrow">PERSONALIZACIÓN DOCENTE</p>
        <h2>Editar enlaces de integración</h2>
        <p className="muted">
          Ajusta las URLs que verán los estudiantes (grupo de WhatsApp, curso de Moodle, etc.).
          Los cambios se guardan en este navegador.
        </p>

        <form onSubmit={submit} data-testid="edit-links-form">
          <div className="edit-links-grid">
            {TOOLS.map((t) => {
              const bad = !isValidUrl(form[t.key]);
              return (
                <label key={t.key} className="edit-link-field">
                  <span className="ell-name">
                    <i style={{ background: t.color }} aria-hidden="true" />
                    {t.name}
                  </span>
                  <input
                    type="url"
                    value={form[t.key] || ""}
                    aria-invalid={bad}
                    data-testid={`edit-link-${t.key}`}
                    placeholder="https://…"
                    onChange={(e) => setField(t.key, e.target.value)}
                  />
                  {bad && <em className="field-error">Debe iniciar con http:// o https://</em>}
                </label>
              );
            })}
          </div>

          <div className="edit-links-actions">
            <button type="button" className="ghost" onClick={resetDefaults} data-testid="edit-links-reset">
              <RotateCcw size={14} aria-hidden="true" /> Restablecer URLs por defecto
            </button>
            <div className="ela-right">
              <button type="button" className="ghost" onClick={onClose} data-testid="edit-links-cancel">
                Cancelar
              </button>
              <button type="submit" className="primary" disabled={invalid} data-testid="edit-links-save">
                <Save size={15} aria-hidden="true" /> Guardar cambios
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
