import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Plus, X, CheckCircle2, MessageCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Empty } from "@/components/ui/states";
import SubjectResources from "@/components/SubjectResources";

export default function SubjectDetail({ user }) {
  const { id } = useParams();
  const [subject, setSubject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", due_time: "23:59" });
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const nav = useNavigate();

  const load = () =>
    Promise.all([api.get("/subjects"), api.get(`/subjects/${id}/tasks`)])
      .then(([s, t]) => {
        setSubject(s.data.find((x) => x.id === id));
        setTasks(t.data);
      })
      .catch(() => setError("No pudimos cargar esta asignatura."));

  useEffect(() => {
    load();
  }, [id]);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/subjects/${id}/tasks`, form);
      setShowCreate(false);
      setForm({ title: "", description: "", due_date: "", due_time: "23:59" });
      load();
    } catch (x) {
      setError(x.response?.data?.detail || "No pudimos crear la tarea.");
    }
  };

  const submit = async () => {
    try {
      await api.post(`/tasks/${selected.id}/submissions`, { text });
      setSelected(null);
      setText("");
      load();
    } catch (x) {
      setError(x.response?.data?.detail || "No pudimos entregar la tarea.");
    }
  };

  if (!subject)
    return (
      <section className="page">
        <div className="loading" data-testid="subject-loading">
          Cargando asignatura…
        </div>
      </section>
    );

  return (
    <section className="page">
      <button className="back-link" onClick={() => nav("/asignaturas")} data-testid="back-to-subjects">
        <ArrowRight size={15} className="back-icon" /> Asignaturas
      </button>
      <div className="subject-detail-head">
        <div>
          <p className="eyebrow">
            {subject.code} · SEMESTRE {subject.semester}
          </p>
          <h1>{subject.name}</h1>
          <p className="lede">
            {subject.professor} · {subject.program}
          </p>
        </div>
        {user.role !== "student" && (
          <div className="head-actions">
            <button
              className="ghost"
              onClick={() => nav(`/chat/${subject.id}`)}
              data-testid="open-subject-chat"
            >
              <MessageCircle size={15} /> Abrir chat
            </button>
            <button className="primary" onClick={() => setShowCreate(!showCreate)} data-testid="new-task-button">
              <Plus size={17} /> Nueva tarea
            </button>
          </div>
        )}
        {user.role === "student" && (
          <button
            className="ghost"
            onClick={() => nav(`/chat/${subject.id}`)}
            data-testid="open-subject-chat"
          >
            <MessageCircle size={15} /> Abrir chat
          </button>
        )}
      </div>
      {error && (
        <div className="error" data-testid="tasks-error">
          {error}
        </div>
      )}
      {showCreate && (
        <form className="composer task-form" onSubmit={create}>
          <h3>Crear tarea</h3>
          <input
            data-testid="task-title-input"
            required
            placeholder="Título de la tarea"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            data-testid="task-description-input"
            required
            placeholder="Instrucciones y criterios de entrega"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="task-fields">
            <label>
              Fecha límite
              <input
                data-testid="task-due-date-input"
                type="date"
                required
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </label>
            <label>
              Hora
              <input
                data-testid="task-due-time-input"
                type="time"
                value={form.due_time}
                onChange={(e) => setForm({ ...form, due_time: e.target.value })}
              />
            </label>
          </div>
          <button className="primary" data-testid="submit-task-button">
            Publicar tarea <ArrowRight size={15} />
          </button>
        </form>
      )}
      <div className="section-title tasks-title">
        <div>
          <p className="eyebrow">TRABAJO ACADÉMICO</p>
          <h2>Tareas y entregas</h2>
        </div>
        <span className="task-count" data-testid="task-count">
          {tasks.length} tareas
        </span>
      </div>
      <div className="tasks-list">
        {tasks.length ? (
          tasks.map((t) => (
            <div className="task-card" key={t.id} data-testid={`task-card-${t.id}`}>
              <div className="task-date">
                <strong>
                  {new Date(`${t.due_date}T${t.due_time}`).toLocaleDateString("es-CO", {
                    timeZone: "America/Bogota",
                    day: "2-digit",
                    month: "short",
                  })}
                </strong>
                <span>Entrega</span>
              </div>
              <div className="task-content">
                <div className="task-status">{t.submission?.status || "Pendiente"}</div>
                <h3>{t.title}</h3>
                <p>{t.description}</p>
                <small>
                  Fecha límite: {t.due_date} · {t.due_time}
                </small>
                {t.submission?.feedback && (
                  <div className="feedback" data-testid={`task-feedback-${t.id}`}>
                    <CheckCircle2 size={15} /> {t.submission.feedback}
                    {t.submission.grade !== null && ` · ${t.submission.grade}/5`}
                  </div>
                )}
              </div>
              {user.role === "student" && (
                <button
                  className="primary small"
                  onClick={() => {
                    setSelected(t);
                    setText(t.submission?.text || "");
                  }}
                  data-testid={`submit-task-${t.id}`}
                >
                  {t.submission ? "Actualizar entrega" : "Entregar"} <ArrowRight size={14} />
                </button>
              )}
            </div>
          ))
        ) : (
          <Empty text="Aún no hay tareas publicadas en esta asignatura" />
        )}
      </div>
      {selected && (
        <div className="modal-backdrop">
          <div className="modal" data-testid="submission-modal">
            <button className="close" onClick={() => setSelected(null)} data-testid="close-submission-modal">
              <X />
            </button>
            <p className="eyebrow">ENTREGA ACADÉMICA</p>
            <h2>{selected.title}</h2>
            <p className="modal-detail">
              Fecha límite: {selected.due_date} · {selected.due_time}
            </p>
            <label>
              Tu respuesta
              <textarea
                data-testid="submission-text-input"
                required
                placeholder="Escribe tu solución o comentarios…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <button className="primary wide" onClick={submit} data-testid="confirm-submission-button">
              Enviar entrega <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      <SubjectResources subjectId={id} user={user} />
    </section>
  );
}
