import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search as SearchIcon, ArrowRight, Users, BookOpen, CircleHelp, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { Empty } from "@/components/ui/states";

const sectionMeta = {
  people: { icon: Users, label: "Personas", route: (x) => `/perfil/${x.id}` },
  subjects: { icon: BookOpen, label: "Asignaturas", route: (x) => `/asignaturas/${x.id}` },
  questions: { icon: CircleHelp, label: "Dudas", route: (x) => `/dudas/${x.id}` },
  resources: { icon: FileText, label: "Recursos", route: (x) => `/asignaturas/${x.subject_id}` },
};

export default function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const nav = useNavigate();
  const [state, setState] = useState({ people: [], subjects: [], questions: [], resources: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setState({ people: [], subjects: [], questions: [], resources: [] });
      return;
    }
    setLoading(true);
    api
      .get(`/search?q=${encodeURIComponent(q)}`)
      .then((r) => setState(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q]);

  const total = state.people.length + state.subjects.length + state.questions.length + state.resources.length;

  return (
    <section className="page search-page" data-testid="search-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">ENCONTRAR · GLOBAL</p>
          <h1>{q ? `Resultados para “${q}”` : "Buscar"}</h1>
          <p className="lede">
            {q ? `${total} coincidencias en personas, asignaturas, dudas y recursos.` : "Escribe algo en la barra de arriba para comenzar."}
          </p>
        </div>
      </div>
      {loading && <p className="muted">Buscando…</p>}
      {!loading &&
        Object.entries(sectionMeta).map(([key, meta]) => {
          const items = state[key] || [];
          const Icon = meta.icon;
          if (!items.length) return null;
          return (
            <div key={key} className="search-section" data-testid={`search-section-${key}`}>
              <div className="section-title compact">
                <h3>
                  <Icon size={15} /> {meta.label}
                </h3>
                <span>{items.length}</span>
              </div>
              <ul className="search-hits">
                {items.map((x) => {
                  const title =
                    key === "people"
                      ? x.name
                      : key === "subjects"
                      ? `${x.name} · ${x.code}`
                      : x.title;
                  const sub =
                    key === "people"
                      ? `${x.role || ""} · ${x.program || ""}`.trim()
                      : key === "subjects"
                      ? `${x.professor || ""} · ${x.program || ""}`.trim()
                      : key === "questions"
                      ? `${x.subject || ""} · ${x.status || ""}`.trim()
                      : x.description;
                  return (
                    <li key={x.id} onClick={() => nav(meta.route(x))} role="button" data-testid={`search-hit-${x.id}`}>
                      <b>{title}</b>
                      {sub && <small>{sub}</small>}
                      <ArrowRight size={14} />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      {!loading && q && total === 0 && <Empty text={`Sin resultados para “${q}”.`} />}
    </section>
  );
}
