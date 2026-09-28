import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, CalendarDays, Bookmark, ArrowRight, Bot, Plus, CircleHelp } from "lucide-react";
import { api } from "@/lib/api";
import { Loading, Empty } from "@/components/ui/states";

const Stat = ({ icon, title, value, sub, color }) => (
  <div className="stat" data-testid={`stat-${title.toLowerCase().replaceAll(" ", "-")}`}>
    <div className={`stat-icon ${color}`}>{icon}</div>
    <div>
      <small>{title}</small>
      <strong>{value}</strong>
      <span>{sub}</span>
    </div>
  </div>
);

export default function Dashboard({ user }) {
  const [data, setData] = useState(null);
  const nav = useNavigate();
  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data));
  }, []);
  if (!data) return <Loading />;
  const today = new Date().toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <section className="page">
      <div className="page-head reveal">
        <div>
          <p className="eyebrow">{today}</p>
          <h1>Hola, {user.name.split(" ")[0]}.</h1>
          <p className="lede">¿Qué necesitas encontrar hoy?</p>
        </div>
        <button className="primary" onClick={() => nav("/dudas")} data-testid="ask-question-button">
          <Plus size={17} /> Hacer una pregunta
        </button>
      </div>
      <div className="stats">
        <Stat icon={<BookOpen />} title="Mis asignaturas" value={data.stats.subjects} sub="activas este semestre" color="teal" />
        <Stat icon={<CalendarDays />} title="Próximas asesorías" value={data.stats.pending} sub="por coordinar" color="blue" />
        <Stat icon={<Bookmark />} title="Guardados" value={data.stats.saved} sub="para volver después" color="red" />
      </div>
      <div className="grid-main">
        <div className="section">
          <div className="section-title">
            <h3>Mis asignaturas</h3>
            <button onClick={() => nav("/asignaturas")} data-testid="see-all-subjects">
              Ver todas <ArrowRight size={15} />
            </button>
          </div>
          <div className="subject-grid">
            {data.subjects.slice(0, 4).map((s) => (
              <div
                className={`subject-card ${s.color || "teal"}`}
                key={s.id}
                data-testid={`subject-card-${s.code}`}
                onClick={() => nav(`/asignaturas/${s.id}`)}
                role="button"
              >
                <div className="subject-top">
                  <span>{s.code}</span>
                  <BookOpen size={18} />
                </div>
                <h3>{s.name}</h3>
                <p>{s.professor}</p>
                <small>{s.program}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="ai-callout">
          <div className="ai-orbit">
            <Bot size={25} />
          </div>
          <p className="eyebrow">TU ACOMPAÑANTE</p>
          <h3>
            ¿Tienes una duda
            <br />
            para comenzar?
          </h3>
          <p>Pregunta al asistente o encuentra a quién acudir.</p>
          <button onClick={() => nav("/asistente-ia")} data-testid="dashboard-ai-button">
            Hablar con el asistente <ArrowRight size={15} />
          </button>
        </div>
      </div>
      <div className="section recent">
        <div className="section-title">
          <h3>Actividad reciente</h3>
          <button onClick={() => nav("/dudas")} data-testid="see-all-questions">
            Ver todas <ArrowRight size={15} />
          </button>
        </div>
        {data.questions.length ? (
          data.questions.map((q) => (
            <div
              className="list-row"
              key={q.id}
              data-testid={`recent-question-${q.id}`}
              onClick={() => nav(`/dudas/${q.id}`)}
              role="button"
            >
              <div className="list-icon">
                <CircleHelp size={17} />
              </div>
              <div>
                <strong>{q.title}</strong>
                <span>
                  {q.subject} · {q.status}
                </span>
              </div>
              <small>{new Date(q.created_at).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}</small>
            </div>
          ))
        ) : (
          <Empty text="Aún no hay actividad" />
        )}
      </div>
    </section>
  );
}
