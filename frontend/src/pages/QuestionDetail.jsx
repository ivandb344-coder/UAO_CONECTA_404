import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Send, CheckCircle2, Award } from "lucide-react";
import { api } from "@/lib/api";
import { Loading } from "@/components/ui/states";
import { StarsDisplay, StarsInput } from "@/components/ui/Stars";

export default function QuestionDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [question, setQuestion] = useState(null);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () =>
    api
      .get(`/questions/${id}`)
      .then((r) => setQuestion(r.data))
      .catch(() => setError("No pudimos cargar esta duda."));

  useEffect(() => {
    load();
  }, [id]);

  if (!question && !error) return <Loading label="Cargando duda…" />;
  if (error) return <div className="page"><div className="error">{error}</div></div>;

  const answer = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      await api.post(`/questions/${id}/answers`, { body });
      setBody("");
      await load();
    } catch {
      setError("No pudimos publicar la respuesta.");
    }
    setSaving(false);
  };

  const rate = async (answerId, value) => {
    try {
      await api.post(`/answers/${answerId}/rating`, { rating: value });
      await load();
    } catch (x) {
      setError(x.response?.data?.detail || "No pudimos guardar la valoración.");
    }
  };

  const accept = async (answerId) => {
    try {
      await api.post(`/questions/${id}/accept/${answerId}`);
      await load();
    } catch (x) {
      setError(x.response?.data?.detail || "No pudimos aceptar esa respuesta.");
    }
  };

  const answers = [...(question.answers || [])].sort((a, b) => {
    if (a.is_accepted !== b.is_accepted) return a.is_accepted ? -1 : 1;
    return (b.rating || 0) - (a.rating || 0);
  });

  return (
    <section className="page">
      <button className="back-link" onClick={() => nav("/dudas")} data-testid="back-to-questions">
        <ArrowRight size={15} className="back-icon" /> Dudas
      </button>
      <div className="question-detail-head">
        <span className={`status ${question.status === "Resuelta" ? "done" : "open"}`} data-testid="question-status">
          {question.status}
        </span>
        <span className="meta-line">{question.subject}</span>
      </div>
      <h1 data-testid="question-detail-title">{question.title}</h1>
      <p className="lede" style={{ marginTop: 12 }}>
        {question.description}
      </p>
      <div className="question-foot" style={{ marginTop: 18 }}>
        <span>{question.author || "Anónimo"}</span>
        <span>{answers.length} respuestas</span>
        <span>{new Date(question.created_at).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}</span>
      </div>

      {error && (
        <div className="error" data-testid="question-detail-error" style={{ marginTop: 20 }}>
          {error}
        </div>
      )}

      <div className="section-title" style={{ marginTop: 42 }}>
        <h3>{answers.length ? "Respuestas" : "Sé la primera persona en responder"}</h3>
      </div>

      <div className="answer-list">
        {answers.map((a) => (
          <article
            key={a.id}
            className={`answer-card ${a.is_accepted ? "accepted" : ""}`}
            data-testid={`answer-${a.id}`}
          >
            {a.is_accepted && (
              <div className="accepted-badge" data-testid={`accepted-badge-${a.id}`}>
                <CheckCircle2 size={14} /> Respuesta aceptada
              </div>
            )}
            <header className="answer-head">
              <div>
                <strong>{a.author}</strong>
                <span>
                  {a.role ? `${a.role === "professor" ? "Profesor" : a.role === "monitor" ? "Monitor" : "Estudiante"} · ` : ""}
                  {new Date(a.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <StarsDisplay value={a.rating || 0} count={a.rating_count || 0} compact />
            </header>
            <p className="answer-body">{a.body}</p>
            <footer className="answer-foot">
              <div className="rate-row" data-testid={`rate-row-${a.id}`}>
                {a.can_rate ? (
                  <>
                    <span>Tu valoración</span>
                    <StarsInput
                      value={a.my_rating || 0}
                      onChange={(v) => rate(a.id, v)}
                      testid={`rate-answer-${a.id}`}
                    />
                    {a.my_rating && <em className="hint">Puedes actualizarla cuando quieras.</em>}
                  </>
                ) : (
                  <em className="hint">No puedes valorar tu propia respuesta.</em>
                )}
              </div>
              {question.is_owner && !a.is_accepted && (
                <button
                  className="ghost accept-btn"
                  onClick={() => accept(a.id)}
                  data-testid={`accept-answer-${a.id}`}
                >
                  <Award size={14} /> Marcar como respuesta aceptada
                </button>
              )}
            </footer>
          </article>
        ))}
      </div>

      <form className="composer answer-composer" onSubmit={answer}>
        <h3>Escribe una respuesta</h3>
        <textarea
          placeholder="Comparte lo que sabes de forma clara y respetuosa…"
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          data-testid="answer-body-input"
        />
        <button className="primary" disabled={saving} data-testid="submit-answer-button">
          <Send size={15} /> {saving ? "Publicando…" : "Publicar respuesta"}
        </button>
      </form>
    </section>
  );
}
