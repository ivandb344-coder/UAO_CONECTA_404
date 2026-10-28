import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, BookOpen, Medal, Star, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import Avatar from "@/components/Avatar";
import { Empty, Loading } from "@/components/ui/states";

const MODES = [
  { key: "by_answers", title: "Más respuestas", description: "Monitores que más han aportado respuestas a la comunidad." },
  { key: "by_rating", title: "Mejor valorados", description: "Promedio de valoración recibido en respuestas de estudiantes." },
];

function Podium({ rows, mode, onOpenProfile }) {
  const places = [
    { row: rows[1], position: 2 },
    { row: rows[0], position: 1 },
    { row: rows[2], position: 3 },
  ].filter((place) => place.row);
  if (!places.length) return null;

  return (
    <div className="ranking-podium" aria-label="Podio de los tres primeros puestos" data-testid="ranking-podium">
      {places.map(({ row, position }) => (
        <article className={`podium-place place-${position}`} key={row.id} data-testid={`ranking-podium-${position}`}>
          <span className="podium-medal" aria-label={`${position}° puesto`}>
            {position === 1 ? <Trophy size={20} aria-hidden="true" /> : <Medal size={19} aria-hidden="true" />}
          </span>
          <button type="button" className="podium-profile" onClick={() => onOpenProfile(row.id)} aria-label={`Ver perfil de ${row.name}`}>
            <Avatar user={row} size="large" className="podium-avatar" />
            <strong>{row.name}</strong>
            <small>{row.program || "Monitor UAO"}</small>
          </button>
          <div className="podium-metrics">
            {mode === "by_rating" ? <><Star size={14} fill="currentColor" aria-hidden="true" /> {row.rating.toFixed(1)} <span>· {row.rating_count} valoraciones</span></> : <><BookOpen size={14} aria-hidden="true" /> {row.answers} <span>respuestas</span></>}
          </div>
          <span className="podium-step">{position}</span>
        </article>
      ))}
    </div>
  );
}

export default function Ranking() {
  const [data, setData] = useState(null);
  const [mode, setMode] = useState("by_answers");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setError("");
    api.get("/ranking/monitors")
      .then((response) => { if (active) setData(response.data); })
      .catch(() => { if (active) setError("No pudimos cargar el ranking ahora. Intenta nuevamente en un momento."); });
    return () => { active = false; };
  }, [retry]);

  if (!data && !error) return <section className="page ranking-page"><Loading label="Cargando reconocimientos…" /></section>;
  if (error) return <section className="page ranking-page"><div className="error" role="alert">{error} <button className="ghost small" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></div></section>;

  const rows = data?.[mode] || [];
  const activeMode = MODES.find((item) => item.key === mode);
  return (
    <section className="page ranking-page" data-testid="ranking-page">
      <div className="page-head ranking-header">
        <div>
          <p className="eyebrow">RECONOCER · EN COMUNIDAD</p>
          <h1>Reconocimientos</h1>
          <p className="lede">Celebramos a quienes comparten su conocimiento y acompañan a otros estudiantes.</p>
        </div>
        <button className="primary" onClick={() => navigate("/dudas")} data-testid="ranking-contribute">
          <Award size={16} aria-hidden="true" /> Responder una duda
        </button>
      </div>

      <div className="ranking-tabs" role="tablist" aria-label="Tipo de ranking">
        {MODES.map((item) => (
          <button type="button" key={item.key} role="tab" aria-selected={mode === item.key} className={mode === item.key ? "active" : ""} onClick={() => setMode(item.key)} data-testid={`ranking-tab-${item.key}`}>
            {item.title}
          </button>
        ))}
      </div>
      <div className="ranking-section-head">
        <div><h2>{activeMode.title}</h2><p>{activeMode.description}</p></div>
        <span className="ranking-evidence">Datos de respuestas y valoraciones registradas</span>
      </div>

      {!rows.length ? <Empty text={mode === "by_rating" ? "Aún no hay valoraciones suficientes para mostrar este reconocimiento." : "Aún no hay respuestas de monitores para mostrar."} /> : (
        <>
          <Podium rows={rows.slice(0, 3)} mode={mode} onOpenProfile={(id) => navigate(`/perfil/${id}`)} />
          <div className="ranking-table-wrap">
            <table className="ranking-table">
              <caption className="sr-only">Tabla de posiciones: {activeMode.title}</caption>
              <thead><tr><th scope="col">Puesto</th><th scope="col">Monitor</th><th scope="col">Respuestas</th><th scope="col">Aceptadas</th><th scope="col">Calificación</th><th scope="col">Valoraciones</th></tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row.id} data-testid={`ranking-row-${row.id}`}>
                  <td><span className="ranking-position">{row.position}</span></td>
                  <td><button type="button" className="ranking-person" onClick={() => navigate(`/perfil/${row.id}`)}><Avatar user={row} size="tiny" /><span><strong>{row.name}</strong><small>{row.program || "Monitor UAO"}</small></span></button></td>
                  <td>{row.answers}</td><td>{row.accepted}</td>
                  <td>{row.rating_count ? <span className="ranking-rating"><Star size={14} fill="currentColor" aria-hidden="true" /> {row.rating.toFixed(1)} / 5</span> : <span className="muted">Sin valoraciones</span>}</td>
                  <td>{row.rating_count}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
      <p className="ranking-note" role="note">El ranking usa respuestas y valoraciones reales. Las valoraciones no afectan notas académicas; se muestran junto con el número de aportes para dar contexto.</p>
    </section>
  );
}
