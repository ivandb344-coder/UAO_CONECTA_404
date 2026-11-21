import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Plus, X, CheckCircle2, MessageCircle, Upload, FileText, ClipboardCheck, LockKeyhole, Trash2, LogOut, Check, Copy } from "lucide-react";
import { api } from "@/lib/api";
import SubjectResources from "@/components/SubjectResources";
import FileActions from "@/components/files/FileActions";
import FilePreviewModal from "@/components/files/FilePreviewModal";
import { playUiSound } from "@/lib/audioFeedback";

const localDateInput = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const formatTaskDueDate = (dueDate, dueTime) => {
  if (!dueDate) return "—";
  const parsed = new Date(`${dueDate}T${dueTime || "23:59"}`);
  if (Number.isNaN(parsed.getTime())) return dueDate;
  return parsed.toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
  });
};

export default function SubjectDetail({ user }) {
  const { id } = useParams();
  const [subject, setSubject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", due_time: "23:59" });
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [subjectActionBusy, setSubjectActionBusy] = useState(false);
  const fileRef = useRef(null);
  const toastTimer = useRef(null);
  const nav = useNavigate();

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const showToast = useCallback((message) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    playUiSound("save");
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !uploading && !submittingTask) setSelected(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected, uploading, submittingTask]);

  const load = useCallback(() =>
    Promise.all([api.get("/subjects"), api.get(`/subjects/${id}/tasks`)])
      .then(([s, t]) => {
        const found = s.data.find((x) => x.id === id);
        setSubject(found || null);
        setTasks(t.data);
        if (!found) setError("No tienes acceso a esta asignatura o ya no está disponible.");
      })
      .catch(() => setError("No pudimos cargar esta asignatura.")), [id]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (creatingTask) return;
    setCreatingTask(true);
    setError("");
    try {
      await api.post(`/subjects/${id}/tasks`, form);
      setShowCreate(false);
      setForm({ title: "", description: "", due_date: "", due_time: "23:59" });
      await load();
      showToast("Tarea publicada correctamente.");
    } catch (x) {
      const detail = x.response?.data?.detail;
      setError(detail?.fields?.due_date || detail?.fields?.due_time || detail?.fields?.title || (typeof detail === "string" ? detail : "") || "No pudimos crear la tarea.");
    } finally {
      setCreatingTask(false);
    }
  };

  const closeSubject = async () => {
    if (!window.confirm(`¿Cerrar ${subject.name}? Sus integrantes conservarán el historial y el chat quedará en solo lectura.`)) return;
    setSubjectActionBusy(true);
    setError("");
    try {
      await api.post(`/subjects/${id}/close`);
      setSubject((current) => ({ ...current, status: "closed" }));
      setShowCreate(false);
      showToast("Asignatura cerrada en modo de solo lectura.");
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "No pudimos cerrar la asignatura.");
    } finally {
      setSubjectActionBusy(false);
    }
  };

  const deleteSubject = async () => {
    if (!window.confirm(`¿Eliminar ${subject.name} del listado? El chat se cerrará y la asignatura dejará de estar disponible para sus integrantes.`)) return;
    setSubjectActionBusy(true);
    setError("");
    try {
      await api.delete(`/subjects/${id}`);
      nav("/asignaturas");
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "No pudimos eliminar la asignatura.");
      setSubjectActionBusy(false);
    }
  };

  const leaveSubject = async () => {
    if (!window.confirm(`¿Salir de ${subject.name}? Ya no verás el espacio ni podrás escribir en su chat.`)) return;
    setSubjectActionBusy(true);
    setError("");
    try {
      await api.delete(`/subjects/${id}/members/me`);
      nav("/asignaturas");
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "No pudimos salir de la asignatura.");
      setSubjectActionBusy(false);
    }
  };

  const onFileChosen = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setError("El archivo de la entrega no puede pesar más de 25MB.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/files", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setAttachment({ ...response.data, size: file.size });
    } catch {
      setError("No pudimos subir el archivo de la entrega. Intenta nuevamente.");
    } finally {
      setUploading(false);
    }
  };

  const copyAccessCode = async () => {
    if (!subject?.access_code) return;
    try {
      await navigator.clipboard.writeText(subject.access_code);
      showToast("Código de unión copiado al portapapeles.");
    } catch {
      showToast(`Código de unión: ${subject.access_code}`);
    }
  };

  const submit = async () => {
    if (submittingTask || uploading) return;
    if (!text.trim() && !attachment) {
      setError("Escribe una respuesta o adjunta un archivo para entregar la tarea.");
      return;
    }
    setSubmittingTask(true);
    setError("");
    try {
      await api.post(`/tasks/${selected.id}/submissions`, { text, file_id: attachment?.id || "" });
      setSelected(null);
      setText("");
      setAttachment(null);
      await load();
      showToast("Entrega enviada correctamente.");
    } catch (x) {
      const detail = x.response?.data?.detail;
      setError(detail?.fields?.file_id || (typeof detail === "string" ? detail : "") || "No pudimos entregar la tarea.");
    } finally {
      setSubmittingTask(false);
    }
  };

  if (!subject && error) return (
    <section className="page">
      <div className="error" role="alert" data-testid="subject-unavailable">{error}</div>
      <button type="button" className="ghost" onClick={() => nav("/asignaturas")} data-testid="subject-unavailable-back">Volver a asignaturas</button>
    </section>
  );
  if (!subject)
    return (
      <section className="page">
        <div className="loading" data-testid="subject-loading">
          Cargando asignatura…
        </div>
      </section>
    );

  return (
    <section className="page subject-detail-page">
      <button type="button" className="back-link" onClick={() => nav("/asignaturas")} data-testid="back-to-subjects">
        <ArrowRight size={15} className="back-icon" /> Asignaturas
      </button>
      <div className="subject-detail-head">
        <div className="subject-detail-identity">
          <div className="subject-detail-labels">
            <span className="subject-code">{subject.code}</span>
            <span className="subject-semester">Semestre {subject.semester}</span>
            {subject.access_code && (
              <button
                type="button"
                className="subject-access-pill"
                onClick={copyAccessCode}
                title="Copiar código de unión"
                data-testid="copy-subject-access-code"
              >
                Código: {subject.access_code} <Copy size={12} aria-hidden="true" />
              </button>
            )}
            {subject.status === "closed" && <span className="subject-state-closed">Cerrada</span>}
          </div>
          <h1>{subject.name}</h1>
          <p className="lede">{subject.professor}</p>
          <p className="subject-program">{subject.program}</p>
        </div>
        <div className="subject-detail-actions">
          <div className="subject-primary-actions">
            <button
              type="button"
              className={user.role !== "student" && subject.status !== "closed" ? "ghost" : "primary"}
              onClick={() => nav(`/chat/${subject.id}`)}
              data-testid="open-subject-chat"
            >
              <MessageCircle size={17} /> Abrir chat
            </button>
            {user.role !== "student" && subject.status !== "closed" && (
              <button type="button" className="primary" onClick={() => setShowCreate(!showCreate)} data-testid="new-task-button">
                <Plus size={17} /> Nueva tarea
              </button>
            )}
          </div>
          {subject.owner_id === user.id ? (
            <div className="subject-owner-actions">
              {subject.status !== "closed" && <button type="button" className="ghost small" onClick={closeSubject} disabled={subjectActionBusy} data-testid="close-subject-button"><LockKeyhole size={14} /> Cerrar asignatura</button>}
              <button type="button" className="ghost small danger" onClick={deleteSubject} disabled={subjectActionBusy} data-testid="delete-subject-button"><Trash2 size={14} /> Eliminar asignatura</button>
            </div>
          ) : (
            <button type="button" className="ghost small subject-leave-button" onClick={leaveSubject} disabled={subjectActionBusy} data-testid="leave-subject-button"><LogOut size={14} /> Salir de la asignatura</button>
          )}
        </div>
      </div>
      {subject.status === "closed" && <div className="chat-room-closed subject-closed-banner" role="status" data-testid="subject-closed-banner">Asignatura cerrada. Puedes consultar el material y el historial del chat, pero ya no se pueden publicar tareas, recursos ni mensajes.</div>}
      {error && (
        <div className="error" data-testid="tasks-error">
          {error}
        </div>
      )}
      {showCreate && subject.status !== "closed" && (
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
                min={localDateInput()}
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
          <button className="primary" disabled={creatingTask} data-testid="submit-task-button">
            {creatingTask ? "Publicando…" : "Publicar tarea"} <ArrowRight size={15} />
          </button>
        </form>
      )}
      <div className="section-title tasks-title subject-tasks-heading">
        <div>
          <p className="eyebrow">TRABAJO ACADÉMICO</p>
          <h2>Tareas y entregas</h2>
        </div>
        <span className="task-count" data-testid="task-count">{tasks.length} {tasks.length === 1 ? "tarea" : "tareas"}</span>
      </div>
      <div className="tasks-list">
        {tasks.length ? (
          tasks.map((t) => {
            const taskStatus = user.role === "student"
              ? (t.submission?.status || "Pendiente")
              : (subject.status === "closed" ? "Cerrada" : "Publicada");
            const taskStatusTone = taskStatus === "Rechazada"
              ? "danger"
              : ["Entregada", "Revisada", "Aprobada", "Publicada"].includes(taskStatus)
                ? "done"
                : "";
            return (
            <div className="task-card" key={t.id} data-testid={`task-card-${t.id}`}>
              <div className="task-date">
                <strong>
                  {formatTaskDueDate(t.due_date, t.due_time)}
                </strong>
                <span>Entrega</span>
              </div>
              <div className="task-content">
                <div className={`task-status ${taskStatusTone}`.trim()}>{taskStatus}</div>
                <h3>{t.title}</h3>
                <p>{t.description}</p>
                <small>
                  Fecha límite: {t.due_date || "Por confirmar"}{t.due_time ? ` · ${t.due_time}` : ""}
                </small>
                {t.submission?.feedback && (
                  <div className="feedback" data-testid={`task-feedback-${t.id}`}>
                    <CheckCircle2 size={15} /> {t.submission.feedback}
                    {t.submission.grade !== null && t.submission.grade !== undefined && ` · ${t.submission.grade}/5`}
                  </div>
                )}
                {t.submission?.file && (
                  <div className="submission-attached" data-testid={`task-submission-file-${t.id}`}>
                    <FileActions file={t.submission.file} idPrefix={`task-${t.id}`} onPreview={setPreview} onError={setError} showName />
                  </div>
                )}
                {user.role !== "student" && (
                  <button className="ghost small review-shortcut" onClick={() => nav("/revisiones")} data-testid={`task-submissions-${t.id}`}>
                    <ClipboardCheck size={13} /> {t.submissions_count || 0} entregas recibidas
                  </button>
                )}
              </div>
              {user.role === "student" && (
                <button
                  className="primary small"
                  onClick={() => {
                    setSelected(t);
                    setText(t.submission?.text || "");
                    setAttachment(t.submission?.file || null);
                  }}
                  data-testid={`submit-task-${t.id}`}
                >
                  {t.submission ? "Actualizar entrega" : "Entregar"} <ArrowRight size={14} />
                </button>
              )}
            </div>
            );
          })
        ) : (
          <div className="subject-empty-state" data-testid="subject-tasks-empty">
            <span className="subject-empty-icon"><ClipboardCheck size={22} aria-hidden="true" /></span>
            <div>
              <h3>{user.role === "student" ? "Aún no hay tareas publicadas" : "Todavía no has publicado tareas"}</h3>
              <p>{user.role === "student"
                ? "Cuando tu docente publique una actividad, aparecerá aquí con sus instrucciones y fecha de entrega."
                : "Publica una actividad para que el grupo pueda revisar las instrucciones y entregar su trabajo desde aquí."}</p>
            </div>
            {user.role !== "student" && subject.status !== "closed" && <button type="button" className="primary small" onClick={() => setShowCreate(true)} data-testid="create-first-task-button"><Plus size={15} /> Publicar primera tarea</button>}
          </div>
        )}
      </div>
      {selected && (
        <div className="modal-backdrop" onClick={() => { if (!uploading && !submittingTask) setSelected(null); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="submission-modal-title" data-testid="submission-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => { if (!uploading && !submittingTask) setSelected(null); }} aria-label="Cerrar modal de entrega" data-testid="close-submission-modal">
              <X />
            </button>
            <p className="eyebrow">ENTREGA ACADÉMICA</p>
            <h2 id="submission-modal-title">{selected.title}</h2>
            <p className="modal-detail">
              Fecha límite: {selected.due_date || "Por confirmar"}{selected.due_time ? ` · ${selected.due_time}` : ""}
            </p>
            <label>
              Tu respuesta
              <textarea
                data-testid="submission-text-input"
                required={!attachment}
                placeholder="Escribe tu solución o comentarios…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <div className="submission-file-picker">
              <input ref={fileRef} type="file" hidden onChange={onFileChosen} data-testid="submission-file-input" />
              <button type="button" className="ghost" onClick={() => fileRef.current?.click()} disabled={uploading || submittingTask} data-testid="submission-file-button">
                <Upload size={14} /> {uploading ? "Subiendo…" : attachment ? "Cambiar archivo" : "Adjuntar archivo"}
              </button>
              {attachment && (
                <span className="pill" data-testid="submission-attachment">
                  <FileText size={13} /> {attachment.name}
                  <button type="button" className="icon-mini" onClick={() => setAttachment(null)} aria-label="Quitar archivo"><X size={12} /></button>
                </span>
              )}
            </div>
            <button className="primary wide" onClick={submit} disabled={uploading || submittingTask} data-testid="confirm-submission-button">
              {uploading ? "Subiendo archivo…" : submittingTask ? "Enviando…" : "Enviar entrega"} <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      <SubjectResources subjectId={id} user={user} readOnly={subject.status === "closed"} />
      {preview && <FilePreviewModal file={preview} onClose={() => setPreview(null)} />}
      {toast && (
        <div className="save-toast success" role="status" aria-live="polite" data-testid="subject-detail-toast">
          <Check size={15} aria-hidden="true" /> {toast}
        </div>
      )}
    </section>
  );
}
