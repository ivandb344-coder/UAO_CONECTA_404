import { useEffect, useRef, useState } from "react";
import { Plus, FileText, ExternalLink, Trash2, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { openProtectedFile } from "@/services/fileService";
import { Empty } from "@/components/ui/states";
import FileActions from "@/components/files/FileActions";
import FilePreviewModal from "@/components/files/FilePreviewModal";

export default function SubjectResources({ subjectId, user }) {
  const canPublish = user.role === "professor" || user.role === "monitor";
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", kind: "link", url: "" });
  const [attach, setAttach] = useState(null); // {storage_path,name,content_type,size}
  const fileRef = useRef(null);

  const load = () =>
    api
      .get(`/subjects/${subjectId}/resources`)
      .then((r) => setItems(r.data))
      .catch(() => setError("No pudimos cargar los recursos."));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  const uploadFile = async (evt) => {
    const file = evt.target.files?.[0];
    evt.target.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setError("El archivo no puede pesar más de 25MB.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/files", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setAttach({ storage_path: r.data.storage_path, name: r.data.name, content_type: r.data.content_type, size: file.size });
      setForm((f) => ({ ...f, title: f.title || r.data.name }));
    } catch {
      setError("No pudimos subir el archivo.");
    }
    setBusy(false);
  };

  const create = async (e) => {
    e.preventDefault();
    setErrors({});
    setError("");
    const payload = { title: form.title, description: form.description, kind: form.kind };
    if (form.kind === "link") payload.url = form.url;
    else if (attach) Object.assign(payload, attach);
    setBusy(true);
    try {
      await api.post(`/subjects/${subjectId}/resources`, payload);
      setForm({ title: "", description: "", kind: "link", url: "" });
      setAttach(null);
      setOpen(false);
      load();
    } catch (x) {
      const d = x.response?.data?.detail;
      if (d?.fields) setErrors(d.fields);
      else setError("No pudimos publicar el recurso.");
    }
    setBusy(false);
  };

  const remove = async (r) => {
    if (!window.confirm(`¿Eliminar "${r.title}"?`)) return;
    try {
      await api.delete(`/resources/${r.id}`);
      load();
    } catch {
      setError("No pudimos eliminar el recurso.");
    }
  };

  const openFile = async (resource) => {
    try {
      await openProtectedFile(resource.storage_path, { filename: resource.name || resource.title || "recurso" });
    } catch {
      setError("No pudimos abrir este archivo. Verifica que tengas permisos.");
    }
  };

  return (
    <div className="resources-block" data-testid="resources-block">
      <div className="section-title tasks-title">
        <div>
          <p className="eyebrow">MATERIALES</p>
          <h2>Recursos y enlaces</h2>
        </div>
        {canPublish && (
          <button className="ghost small" onClick={() => setOpen(!open)} data-testid="new-resource-button">
            <Plus size={14} /> Publicar recurso
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {open && (
        <form className="composer" onSubmit={create}>
          <h3>Nuevo recurso</h3>
          <div className="task-fields">
            <label className="field">
              <span>Título</span>
              <input
                data-testid="resource-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={errors.title ? "invalid" : ""}
                required
              />
              {errors.title && <span className="field-error">{errors.title}</span>}
            </label>
            <label className="field">
              <span>Tipo</span>
              <select
                data-testid="resource-kind"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
              >
                <option value="link">Enlace</option>
                <option value="file">Archivo</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>Descripción</span>
            <textarea
              data-testid="resource-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Cuenta a quiénes se dirige y cómo usarlo"
            />
          </label>
          {form.kind === "link" ? (
            <label className="field">
              <span>URL</span>
              <input
                data-testid="resource-url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://…"
                className={errors.url ? "invalid" : ""}
              />
              {errors.url && <span className="field-error">{errors.url}</span>}
            </label>
          ) : (
            <div className="field">
              <span>Archivo</span>
              <div className="file-picker">
                <button type="button" className="ghost" onClick={() => fileRef.current?.click()} data-testid="resource-file-button">
                  <Upload size={14} /> {attach ? "Cambiar archivo" : "Seleccionar archivo"}
                </button>
                <input ref={fileRef} type="file" hidden onChange={uploadFile} data-testid="resource-file-input" />
                {attach && (
                  <span className="pill" data-testid="resource-attach">
                    <FileText size={13} /> {attach.name}
                  </span>
                )}
              </div>
              {errors.file && <span className="field-error">{errors.file}</span>}
              <p className="muted small">PDF, Word, Excel, PowerPoint, imágenes o ZIP hasta 25MB.</p>
            </div>
          )}
          <button className="primary" disabled={busy} data-testid="submit-resource-button">
            {busy ? "Publicando…" : "Publicar recurso"}
          </button>
        </form>
      )}

      {items.length ? (
        <ul className="resource-list">
          {items.map((r) => {
            return (
              <li key={r.id} className="resource-item" data-testid={`resource-${r.id}`}>
                <div className="resource-icon">
                  {r.kind === "file" ? <FileText size={18} /> : <ExternalLink size={18} />}
                </div>
                <div className="resource-body">
                  <b>{r.title}</b>
                  {r.description && <p>{r.description}</p>}
                  <small>
                    {r.owner_name} · {new Date(r.created_at).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}
                  </small>
                </div>
                {r.kind === "file" ? (
                  <div className="resource-actions">
                    <button type="button" className="ghost small" onClick={() => openFile(r)} data-testid={`open-resource-${r.id}`}>
                      Abrir
                    </button>
                    <FileActions
                      file={{ storage_path: r.storage_path, name: r.name || r.title, content_type: r.content_type }}
                      idPrefix={`resource-${r.id}`}
                      onPreview={setPreview}
                      onError={setError}
                    />
                  </div>
                ) : (
                  <a href={r.url} target="_blank" rel="noreferrer" className="ghost small" data-testid={`open-resource-${r.id}`}>
                    Abrir
                  </a>
                )}
                {user.id === r.owner_id && (
                  <button className="icon-mini danger" onClick={() => remove(r)} data-testid={`delete-resource-${r.id}`}>
                    <Trash2 size={13} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty text="Aún no hay recursos publicados." />
      )}
      {preview && <FilePreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
