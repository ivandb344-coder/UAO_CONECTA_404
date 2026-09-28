import { useState } from "react";
import { CheckCircle2, ExternalLink, MessageSquareText } from "lucide-react";
import { api, bogotaDate } from "@/lib/api";
import FileActions from "@/components/files/FileActions";

const STATUS_CLASS = { Entregada: "open", Revisada: "done", Aprobada: "done", Rechazada: "danger" };

export default function ReviewCard({ item, onPreview, onReviewed, onError }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ feedback: item.feedback || "", grade: item.grade ?? "", status: item.status === "Entregada" ? "Revisada" : item.status });
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { feedback: form.feedback, status: form.status, grade: form.grade === "" ? null : Number(form.grade) };
      const r = await api.patch(`/submissions/${item.id}/feedback`, payload);
      onReviewed(r.data);
      setOpen(false);
    } catch (x) {
      onError(x.response?.data?.detail || "No pudimos guardar la retroalimentación.");
    }
    setBusy(false);
  };

  return (
    <article className="review-card" data-testid={`review-card-${item.id}`}>
      <div className="review-head">
        <div>
          <span className={`status ${STATUS_CLASS[item.status] || "muted"}`} data-testid={`review-status-${item.id}`}>{item.status}</span>
          <h3>{item.task?.title}</h3>
          <p className="meta-line">
            {item.subject?.code} · {item.subject?.name} · Entregada por <b>{item.student}</b> · {bogotaDate(item.submitted_at)}
          </p>
        </div>
        {item.grade !== null && item.grade !== undefined && (
          <span className="review-grade" data-testid={`review-grade-${item.id}`}>{item.grade}/5</span>
        )}
      </div>
      {item.text && <p className="review-text" data-testid={`review-text-${item.id}`}>{item.text}</p>}
      {item.link && (
        <a href={item.link} target="_blank" rel="noreferrer" className="review-link" data-testid={`review-link-${item.id}`}>
          <ExternalLink size={13} /> {item.link}
        </a>
      )}
      {item.file && <FileActions file={item.file} idPrefix={`submission-${item.id}`} onPreview={onPreview} onError={onError} showName />}
      {item.feedback && !open && (
        <div className="feedback" data-testid={`review-feedback-${item.id}`}>
          <CheckCircle2 size={14} /> {item.feedback}
        </div>
      )}
      <div className="review-foot">
        <button className="ghost small" onClick={() => setOpen(!open)} data-testid={`toggle-feedback-${item.id}`}>
          <MessageSquareText size={13} /> {item.feedback ? "Editar retroalimentación" : "Retroalimentar"}
        </button>
      </div>
      {open && (
        <form className="review-form" onSubmit={save} data-testid={`feedback-form-${item.id}`}>
          <label className="field">
            <span>Retroalimentación</span>
            <textarea required value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} data-testid={`feedback-input-${item.id}`} placeholder="Comenta fortalezas y aspectos por mejorar…" />
          </label>
          <div className="task-fields">
            <label className="field">
              <span>Nota (0 a 5)</span>
              <input type="number" min="0" max="5" step="0.1" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} data-testid={`grade-input-${item.id}`} />
            </label>
            <label className="field">
              <span>Estado</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} data-testid={`status-select-${item.id}`}>
                <option value="Revisada">Revisada</option>
                <option value="Aprobada">Aprobada</option>
                <option value="Rechazada">Rechazada</option>
              </select>
            </label>
          </div>
          <button className="primary small" disabled={busy} data-testid={`save-feedback-${item.id}`}>
            {busy ? "Guardando…" : "Guardar revisión"}
          </button>
        </form>
      )}
    </article>
  );
}
