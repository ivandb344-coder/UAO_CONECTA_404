import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowRight, Search, ShieldCheck, X } from "lucide-react";
import { api } from "@/lib/api";
import { matchesSearch } from "@/lib/searchText";
import { Empty } from "@/components/ui/states";
import { playUiSound } from "@/lib/audioFeedback";

const emptyForm = () => ({ title: "", description: "", subject: "Cálculo I", tags: [], anonymous: false });

export default function Questions({ user }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const nav = useNavigate();
  const draftKey = `uao_question_draft_${user?.id || "session"}`;

  const load = () =>
    api
      .get("/questions")
      .then((r) => setItems(r.data))
      .catch(() => setError("No pudimos cargar las dudas."));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) || "null");
      if (saved && typeof saved === "object") {
        setForm({ ...emptyForm(), ...saved });
        setOpen(true);
        setDraftRestored(true);
      }
    } catch {
      try { sessionStorage.removeItem(draftKey); } catch { /* Ignore unavailable browser storage. */ }
    } finally {
      setDraftLoaded(true);
    }
  }, [draftKey]);

  useEffect(() => {
    if (!draftLoaded) return;
    try {
      if (form.title.trim() || form.description.trim()) sessionStorage.setItem(draftKey, JSON.stringify(form));
      else sessionStorage.removeItem(draftKey);
    } catch {
      // The question form remains usable if the browser blocks session storage.
    }
  }, [form, draftLoaded, draftKey]);

  const create = async (e) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const publish = async () => {
    if (sending) return;
    setSending(true);
    setError("");
    try {
      const r = await api.post("/questions", form);
      playUiSound("question");
      setConfirmOpen(false);
      setOpen(false);
      setForm(emptyForm());
      setDraftRestored(false);
      try { sessionStorage.removeItem(draftKey); } catch { /* Ignore unavailable browser storage. */ }
      nav(`/dudas/${r.data.id}`);
    } catch {
      setError("No pudimos publicar la duda. Intenta de nuevo.");
      setConfirmOpen(false);
    } finally {
      setSending(false);
    }
  };

  const filtered = items
    .filter((q) => (filter === "resolved" ? q.status === "Resuelta" : filter === "unanswered" ? q.status === "Sin respuesta" : true))
    .filter((q) => matchesSearch(query, `${q.title} ${q.description} ${q.subject}`));

  return (
    <section className="page" data-testid="questions-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">ENCONTRAR · COMUNIDAD</p>
          <h1>Dudas</h1>
          <p className="lede">Preguntas reales, respuestas que ayudan a avanzar.</p>
        </div>
        <button className="primary" onClick={() => setOpen(!open)} data-testid="new-question-button">
          <Plus size={17} /> Nueva duda
        </button>
      </div>
      {error && (
        <div className="error" data-testid="questions-error">
          {error}
        </div>
      )}
      {open && (
        <form className="composer" onSubmit={create}>
          <h3>Plantea tu duda</h3>
          <p className="draft-status" role="status" data-testid="question-draft-status">
            {draftRestored ? "Recuperamos tu borrador de esta sesión." : "El borrador se conserva en este navegador mientras completas la duda."}
          </p>
          <input
            data-testid="question-title-input"
            placeholder="Título claro y específico"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            data-testid="question-description-input"
            placeholder="Cuéntanos un poco más…"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            data-testid="question-subject-input"
            placeholder="Asignatura (Ej. Cálculo I)"
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <div className="community-guidance" role="note" data-testid="question-publishing-guidance">
            <ShieldCheck size={18} aria-hidden="true" />
            <p><strong>Antes de publicar:</strong> evita incluir datos personales tuyos o de otras personas y plantea tu duda con respeto.</p>
          </div>
          <div className="form-actions">
            <label className="check">
              <input
                type="checkbox"
                checked={form.anonymous}
                onChange={(e) => setForm({ ...form, anonymous: e.target.checked })}
              />{" "}
              Publicar anónimamente
            </label>
            <button className="primary" data-testid="submit-question-button">
              Enviar duda <ArrowRight size={15} />
            </button>
          </div>
        </form>
      )}
      {confirmOpen && (
        <div className="modal-backdrop question-confirm-backdrop" onClick={() => !sending && setConfirmOpen(false)}>
          <section
            className="modal question-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="question-confirm-title"
            data-testid="question-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="close"
              aria-label="Volver a editar la duda"
              onClick={() => !sending && setConfirmOpen(false)}
              disabled={sending}
            >
              <X size={18} aria-hidden="true" />
            </button>
            <span className="question-confirm-icon" aria-hidden="true"><ShieldCheck size={21} /></span>
            <p className="eyebrow">CONFIRMACIÓN FINAL</p>
            <h2 id="question-confirm-title">¿Quieres enviar esta duda?</h2>
            <p className="muted">Antes de publicarla, confirma que no incluya datos personales y que esté planteada con respeto.</p>
            <div className="question-confirm-summary">
              <strong>{form.title}</strong>
              <span>{form.subject}{form.anonymous ? " · Publicación anónima" : ""}</span>
            </div>
            <div className="question-confirm-actions">
              <button type="button" className="ghost" onClick={() => setConfirmOpen(false)} disabled={sending} data-testid="edit-question-button">
                Volver a editar
              </button>
              <button type="button" className="primary" onClick={publish} disabled={sending} data-testid="confirm-publish-question-button">
                {sending ? "Enviando…" : "Confirmar y publicar"} <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>
      )}
      <div className="filter-bar">
        <div className="search inline">
          <Search size={17} />
          <input
            data-testid="questions-search-input"
            placeholder="Buscar dudas…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          className={`filter ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
          data-testid="all-filter"
        >
          Todas
        </button>
        <button
          className={`filter ${filter === "unanswered" ? "active" : ""}`}
          onClick={() => setFilter("unanswered")}
          data-testid="unanswered-filter"
        >
          Sin respuesta
        </button>
        <button
          className={`filter ${filter === "resolved" ? "active" : ""}`}
          onClick={() => setFilter("resolved")}
          data-testid="resolved-filter"
        >
          Resueltas
        </button>
      </div>
      <div className="question-list">
        {filtered.length ? (
          filtered.map((q) => (
            <div
              className="question"
              key={q.id}
              data-testid={`question-${q.id}`}
              onClick={() => nav(`/dudas/${q.id}`)}
              role="button"
              tabIndex={0}
              aria-label={`Abrir duda: ${q.title}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  nav(`/dudas/${q.id}`);
                }
              }}
            >
              <div className="question-main">
                <div className="question-meta">
                  <span className={`status ${q.status === "Resuelta" ? "done" : "open"}`}>{q.status}</span>
                  <span>{q.subject}</span>
                </div>
                <h3>{q.title}</h3>
                <p>{q.description}</p>
                <div className="question-foot">
                  <span>{q.author || "Anónimo"}</span>
                  <span>{q.answers?.length || 0} respuestas</span>
                  <span>{new Date(q.created_at).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}</span>
                </div>
              </div>
              <ArrowRight className="row-arrow" size={19} />
            </div>
          ))
        ) : (
          <Empty text="Todavía no hay dudas para ese filtro" />
        )}
      </div>
    </section>
  );
}
