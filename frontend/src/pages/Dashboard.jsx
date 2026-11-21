import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, CalendarDays, Bookmark, ArrowRight, Bot, Plus, CircleHelp, Check, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { useViewMode } from "@/lib/viewMode";
import { Loading, Empty } from "@/components/ui/states";
import CreateSubjectForm from "@/components/CreateSubjectForm";
import RoleBadge from "@/components/hub/RoleBadge";
import MonitorToggle from "@/components/hub/MonitorToggle";
import IntegrationLayer from "@/components/hub/IntegrationLayer";
import MonitorPanel from "@/components/hub/MonitorPanel";
import { playUiSound } from "@/lib/audioFeedback";

const Stat = ({ icon, title, value, sub, color }) => (
  <div className="stat" data-testid={`stat-${title.toLowerCase().replaceAll(" ", "-")}`}>
    <div className={`stat-icon ${color}`}>{icon}</div>
    <div><small>{title}</small><strong>{value}</strong><span>{sub}</span></div>
  </div>
);

export default function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const nav = useNavigate();
  const { viewRole, monitorMode } = useViewMode();

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const showToast = useCallback((message) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    playUiSound("save");
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  }, []);

  const load = useCallback(() => {
    setError("");
    api.get("/dashboard")
      .then((r) => setData(r.data))
      .catch(() => setError("No pudimos cargar tu resumen de inicio. Verifica tu conexión e inténtalo de nuevo."));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error && !data) {
    return (
      <section className="page hub-page" data-testid="dashboard-page">
        <div className="error search-error" role="alert" data-testid="dashboard-error">
          <span>{error}</span>
          <button type="button" className="ghost small" onClick={load} data-testid="dashboard-retry">
            <RefreshCw size={13} aria-hidden="true" /> Reintentar
          </button>
        </div>
      </section>
    );
  }
  if (!data) return <Loading />;

  const today = new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" });
  const canCreateSubject = viewRole !== "student";
  const firstName = (user?.name || "Estudiante").trim().split(" ")[0] || "Estudiante";

  return (
    <section className="page hub-page" data-testid="dashboard-page">
      <div className="page-head hub-hero reveal">
        <div>
          <p className="eyebrow">{today}</p>
          <h1>Hola, {firstName}.</h1>
          <p className="lede">{viewRole === "professor" ? "Esto es lo que tus cursos necesitan hoy." : "Todo lo que necesitas saber hoy, sin saltar entre plataformas."}</p>
          <div className="hero-meta">
            <RoleBadge user={user} viewRole={viewRole} />
            <MonitorToggle compact />
          </div>
        </div>
        <div className="head-actions">
          {canCreateSubject && (
            <button className="ghost" onClick={() => setShowCreate(!showCreate)} data-testid="dashboard-create-subject-button">
              <Plus size={17} aria-hidden="true" /> Crear asignatura
            </button>
          )}
          <button className="primary doubts-cta" onClick={() => nav("/dudas")} data-testid="ask-question-button">
            <CircleHelp size={17} aria-hidden="true" /> {viewRole === "student" ? "Ir a Dudas" : "Ver dudas abiertas"}
          </button>
        </div>
      </div>
      {showCreate && (
        <CreateSubjectForm
          onCancel={() => setShowCreate(false)}
          onCreated={(created) => {
            setData((c) => {
              const nextSubjects = [created, ...(c.subjects || [])];
              return {
                ...c,
                subjects: nextSubjects,
                stats: { ...c.stats, subjects: (c.stats?.subjects ?? 0) + 1 },
              };
            });
            setShowCreate(false);
            showToast("Asignatura creada correctamente.");
          }}
        />
      )}

      <IntegrationLayer user={user} />
      {monitorMode && <MonitorPanel user={user} />}

      <div className="stats">
        <Stat icon={<BookOpen />} title="Mis asignaturas" value={data.stats.subjects} sub="activas este semestre" color="red" />
        <Stat icon={<CalendarDays />} title="Próximas asesorías" value={data.stats.pending} sub="por coordinar" color="navy" />
        <Stat icon={<Bookmark />} title="Guardados" value={data.stats.saved} sub="para volver después" color="coral" />
      </div>

      <div className="grid-main">
        <div className="section">
          <div className="section-title">
            <h3>Mis asignaturas</h3>
            <button onClick={() => nav("/asignaturas")} data-testid="see-all-subjects">Ver todas <ArrowRight size={15} aria-hidden="true" /></button>
          </div>
          {data.subjects.length ? (
            <div className="subject-grid">
              {data.subjects.slice(0, 4).map((s) => (
                <div
                  className={`subject-card ${s.color || "teal"}`}
                  key={s.id}
                  data-testid={`subject-card-${s.code}`}
                  onClick={() => nav(`/asignaturas/${s.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      nav(`/asignaturas/${s.id}`);
                    }
                  }}
                >
                  <div className="subject-top"><span>{s.code}</span><BookOpen size={18} aria-hidden="true" /></div>
                  <h3>{s.name}</h3>
                  <p>{s.professor}</p>
                  <small>{s.program}</small>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="Aún no tienes asignaturas activas." />
          )}
        </div>
        <div className="ai-callout">
          <div className="ai-orbit"><Bot size={25} aria-hidden="true" /></div>
          <p className="eyebrow">RUTA DE APOYO</p>
          <h3>¿No sabes a quién<br />acudir?</h3>
          <p>Pregunta al asistente o encuentra al docente y al monitor de tu asignatura con su horario.</p>
          <button onClick={() => nav("/asistente-ia")} data-testid="dashboard-ai-button">Hablar con el asistente <ArrowRight size={15} aria-hidden="true" /></button>
          <button onClick={() => nav("/asesorias")} data-testid="dashboard-advisories-button">Ver asesorías disponibles <ArrowRight size={15} aria-hidden="true" /></button>
        </div>
      </div>

      <div className="section recent">
        <div className="section-title">
          <h3>Actividad reciente</h3>
          <button onClick={() => nav("/dudas")} data-testid="see-all-questions">Ver todas <ArrowRight size={15} aria-hidden="true" /></button>
        </div>
        {data.questions.length ? data.questions.map((q) => (
          <div
            className="list-row"
            key={q.id}
            data-testid={`recent-question-${q.id}`}
            onClick={() => nav(`/dudas/${q.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                nav(`/dudas/${q.id}`);
              }
            }}
          >
            <div className="list-icon"><CircleHelp size={17} aria-hidden="true" /></div>
            <div><strong>{q.title}</strong><span>{q.subject} · {q.status}</span></div>
            <small>{new Date(q.created_at).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}</small>
          </div>
        )) : <Empty text="Aún no hay actividad" />}
      </div>

      {toast && (
        <div className="save-toast success" role="status" aria-live="polite" data-testid="dashboard-toast">
          <Check size={15} aria-hidden="true" /> {toast}
        </div>
      )}
    </section>
  );
}
