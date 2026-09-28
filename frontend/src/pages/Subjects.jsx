import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

export default function Subjects() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/subjects")
      .then((r) => setItems(r.data))
      .catch(() => setError("No pudimos cargar las asignaturas."));
  }, []);
  const nav = useNavigate();
  return (
    <section className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">ENCONTRAR · APRENDER</p>
          <h1>Asignaturas</h1>
          <p className="lede">Tu mapa de aprendizaje, en un solo lugar.</p>
        </div>
        <button className="ghost" data-testid="join-subject-button">
          Unirme con código
        </button>
      </div>
      {error && (
        <div className="error" data-testid="subjects-error">
          {error}
        </div>
      )}
      <div className="subject-grid large">
        {items.map((s) => (
          <div className={`subject-card ${s.color || "teal"}`} key={s.id} data-testid={`catalog-subject-${s.code}`}>
            <div className="subject-top">
              <span>{s.code}</span>
              <span className="semester">Semestre {s.semester}</span>
            </div>
            <h3>{s.name}</h3>
            <p>{s.professor}</p>
            <small>{s.program}</small>
            <button
              className="card-link"
              onClick={() => nav(`/asignaturas/${s.id}`)}
              data-testid={`open-subject-${s.code}`}
            >
              Ver asignatura <ArrowRight size={15} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
