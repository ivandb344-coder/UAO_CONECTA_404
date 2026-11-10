import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Plus, Link2, Search, BookOpen, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import CreateSubjectForm from "@/components/CreateSubjectForm";
import { COURSE_KIND_LABELS, UAO_CURRICULA } from "@/data/uaoCurricula";
import { matchesSearch } from "@/lib/searchText";

const roleLabel = (role) => (role === "professor" ? "Profesor" : role === "monitor" ? "Monitor" : "Estudiante");
const OFFICIAL_COURSES = UAO_CURRICULA.flatMap((curriculum) => [
  ...curriculum.courses,
  ...curriculum.electives,
  ...(curriculum.electiveOptions || []),
].map((course) => ({ ...course, program: curriculum.program })));

export default function Subjects({ user }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState(() => searchParams.get("vista") === "catalogo" ? "catalog" : "spaces");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogProgram, setCatalogProgram] = useState("");
  const [catalogKind, setCatalogKind] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("");
  const nav = useNavigate();

  const changeView = (nextView) => {
    setView(nextView);
    setSearchParams(nextView === "catalog" ? { vista: "catalogo" } : {}, { replace: true });
  };

  const load = () => api.get("/subjects").then((r) => setItems(r.data)).catch(() => setError("No pudimos cargar las asignaturas."));
  useEffect(() => { load(); }, []);

  const join = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const response = await api.post("/subjects/join", { code: joinCode });
      setItems((current) => current.map((item) => item.id === response.data.id ? response.data : item));
      setJoinCode("");
      setShowJoin(false);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "No pudimos unirte a esta asignatura.");
    }
  };

  const selectedCurriculum = UAO_CURRICULA.find((curriculum) => curriculum.program === catalogProgram);
  const semesters = [...new Set(items.map((item) => String(item.semester || "")).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const visibleItems = items.filter((item) => !semesterFilter || String(item.semester) === semesterFilter);
  const catalogItems = OFFICIAL_COURSES.filter((course) => {
    const matchesQuery = matchesSearch(catalogQuery, `${course.name} ${course.program}`);
    const matchesProgram = !catalogProgram || course.program === catalogProgram;
    const matchesKind = catalogKind === "all"
      || (catalogKind === "electives" ? course.kind !== "core" : course.kind === "core");
    return matchesQuery && matchesProgram && matchesKind;
  });

  return (
    <section className="page subjects-page" data-testid="subjects-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">ENCONTRAR · APRENDER</p>
          <h1>Asignaturas</h1>
          <p className="lede">Encuentra tus espacios y consulta materias de los programas de ingeniería UAO.</p>
        </div>
        {view === "spaces" && items.length > 0 && <label className="uao-catalog-select semester-filter"><span>Filtrar por semestre</span><select value={semesterFilter} onChange={(event) => setSemesterFilter(event.target.value)} aria-label="Filtrar asignaturas por semestre"><option value="">Todos los semestres</option>{semesters.map((semester) => <option value={semester} key={semester}>Semestre {semester}</option>)}</select></label>}
        {view === "spaces" && <div className="head-actions">
          <button className="ghost" onClick={() => setShowJoin(!showJoin)} data-testid="join-subject-button"><Link2 size={15} /> Unirme con código</button>
          {user && ["professor", "monitor"].includes(user.role) && <button className="primary" onClick={() => setShowCreate(!showCreate)} data-testid="create-subject-button"><Plus size={15} /> Crear asignatura</button>}
        </div>}
      </div>
      <div className="tabs subject-tabs" role="group" aria-label="Espacios y catálogo académico">
        <button type="button" className={`tab ${view === "spaces" ? "active" : ""}`} aria-pressed={view === "spaces"} onClick={() => changeView("spaces")} data-testid="subject-spaces-tab">
          Mis espacios <span>{items.length}</span>
        </button>
        <button type="button" className={`tab ${view === "catalog" ? "active" : ""}`} aria-pressed={view === "catalog"} onClick={() => changeView("catalog")} data-testid="official-catalog-tab">
          <BookOpen size={15} aria-hidden="true" /> Catálogo oficial UAO
        </button>
      </div>
      {error && <div className="error" data-testid="subjects-error">{error}</div>}
      {view === "spaces" ? (
        <>
          {showCreate && user && ["professor", "monitor"].includes(user.role) && <CreateSubjectForm onCancel={() => setShowCreate(false)} onCreated={(created) => { setItems((current) => [created, ...current]); setShowCreate(false); }} />}
          {showJoin && (
            <form className="composer join-subject-form" onSubmit={join} data-testid="join-subject-form">
              <label className="field"><span>Código de unión</span><input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="Ej. A1B2C3D4" required data-testid="join-subject-code" /></label>
              <button className="primary" data-testid="submit-join-subject">Unirme</button>
            </form>
          )}
          <div className="subject-grid large" data-testid="subject-spaces-list">
            {visibleItems.map((s) => (
              <div className={`subject-card ${s.color || "teal"}`} key={s.id} data-testid={`catalog-subject-${s.code}`} onClick={() => nav(`/asignaturas/${s.id}`)} role="link" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); nav(`/asignaturas/${s.id}`); } }} aria-label={`Abrir asignatura ${s.name}`}>
                <div className="subject-top"><span>{s.code}</span><span className="semester">Semestre {s.semester}</span></div>
                <h3>{s.name}</h3>
                <p>{s.creator_name ? `Creada por ${s.creator_name} · ${roleLabel(s.creator_role)}` : s.professor}</p>
                <small>{s.program}</small>
                <span className="card-link" data-testid={`open-subject-${s.code}`}>Ver asignatura <ArrowRight size={15} /></span>
              </div>
            ))}
          </div>
          {!visibleItems.length && <div className="empty">No tienes asignaturas para ese semestre.</div>}
        </>
      ) : (
        <section className="uao-catalog" aria-labelledby="uao-catalog-title" data-testid="uao-course-catalog">
          <div className="uao-catalog-intro">
            <div>
              <p className="eyebrow">FACULTAD DE INGENIERÍA Y CIENCIAS BÁSICAS</p>
              <h2 id="uao-catalog-title">Materias por programa</h2>
              <p>Consulta asignaturas obligatorias, componentes electivos y opciones publicadas en planes oficiales. Elige un programa para abrir su fuente UAO.</p>
            </div>
            <span className="uao-catalog-count">{catalogItems.length} resultados</span>
          </div>

          <div className="uao-catalog-guidance" role="note" data-testid="catalog-purpose-note">
            <BookOpen size={18} aria-hidden="true" />
            <p><strong>Este catálogo es solo de consulta.</strong> Aquí puedes conocer las asignaturas oficiales por programa; no crea espacios ni te inscribe en una materia. Para crear o gestionar un espacio colaborativo, ve a <button type="button" className="inline-link" onClick={() => changeView("spaces")}>Mis espacios</button>. Para ampliar la información, usa los enlaces al plan oficial y a las electivas publicados en cada programa.</p>
          </div>

          <div className="uao-catalog-filters">
            <label className="uao-catalog-search">
              <Search size={17} aria-hidden="true" />
              <input aria-label="Buscar materia o programa" placeholder="Buscar materia o programa…" value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} data-testid="official-course-search" />
            </label>
            <label className="uao-catalog-select"><span>Programa</span>
              <select value={catalogProgram} onChange={(event) => setCatalogProgram(event.target.value)} aria-label="Filtrar por programa" data-testid="official-course-program-filter">
                <option value="">Todos los programas</option>
                {UAO_CURRICULA.map((curriculum) => <option key={curriculum.program} value={curriculum.program}>{curriculum.program}</option>)}
              </select>
            </label>
            <label className="uao-catalog-select"><span>Tipo</span>
              <select value={catalogKind} onChange={(event) => setCatalogKind(event.target.value)} aria-label="Filtrar por tipo de asignatura" data-testid="official-course-kind-filter">
                <option value="all">Todas</option>
                <option value="core">Plan de estudios</option>
                <option value="electives">Electivas y opciones</option>
              </select>
            </label>
          </div>

          {selectedCurriculum && <div className="uao-catalog-source" data-testid="official-curriculum-source">
            <div><strong>{selectedCurriculum.program}</strong><span>{selectedCurriculum.plan}</span></div>
            <a href={selectedCurriculum.source} target="_blank" rel="noreferrer">Ver plan oficial <ExternalLink size={14} aria-hidden="true" /></a>
            {selectedCurriculum.electivesSource && <a href={selectedCurriculum.electivesSource} target="_blank" rel="noreferrer">{selectedCurriculum.electivesYear} <ExternalLink size={14} aria-hidden="true" /></a>}
          </div>}

          <p className="uao-catalog-note" role="note" data-testid="official-catalog-note">
            Este catálogo es una referencia basada en documentos públicos de la UAO. Los nombres y planes pueden cambiar; las electivas concretas dependen de la oferta de cada periodo. Confirma código, créditos, prerrequisitos y disponibilidad en el plan oficial o con tu programa.
          </p>

          {catalogItems.length ? <div className="uao-course-grid">
            {catalogItems.map((course, index) => <article className="uao-course-card" key={`${course.program}-${course.kind}-${course.name}-${index}`}>
              <span className={`uao-course-kind ${course.kind}`}>{COURSE_KIND_LABELS[course.kind]}</span>
              <h3>{course.name}</h3>
              <p>{course.program}</p>
            </article>)}
          </div> : <div className="empty" data-testid="official-catalog-empty">No encontramos materias con esos filtros. Prueba otra palabra o programa.</div>}
        </section>
      )}
    </section>
  );
}
