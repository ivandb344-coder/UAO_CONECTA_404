import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowRight, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Empty } from "@/components/ui/states";

export default function Questions() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    subject: "Cálculo I",
    tags: [],
    anonymous: false,
  });
  const nav = useNavigate();

  const load = () =>
    api
      .get("/questions")
      .then((r) => setItems(r.data))
      .catch(() => setError("No pudimos cargar las dudas."));

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post("/questions", form);
      setOpen(false);
      setForm({ ...form, title: "", description: "" });
      nav(`/dudas/${r.data.id}`);
    } catch {
      setError("No pudimos publicar la duda. Intenta de nuevo.");
    }
  };

  const filtered = items
    .filter((q) => (filter === "resolved" ? q.status === "Resuelta" : filter === "unanswered" ? q.status === "Sin respuesta" : true))
    .filter((q) => (query ? (q.title + q.description + q.subject).toLowerCase().includes(query.toLowerCase()) : true));

  return (
    <section className="page">
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
              Publicar duda <ArrowRight size={15} />
            </button>
          </div>
        </form>
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
