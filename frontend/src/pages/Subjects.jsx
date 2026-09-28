import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Plus, Link2 } from "lucide-react";
import { api } from "@/lib/api";
import CreateSubjectForm from "@/components/CreateSubjectForm";

const roleLabel = (role) => (role === "professor" ? "Profesor" : role === "monitor" ? "Monitor" : "Estudiante");

export default function Subjects() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const nav = useNavigate();

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

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">ENCONTRAR · APRENDER</p>
          <h1>Asignaturas</h1>
          <p className="lede">Tu mapa de aprendizaje, en un solo lugar.</p>
        </div>
        <div className="head-actions">
          <button className="ghost" onClick={() => setShowJoin(!showJoin)} data-testid="join-subject-button"><Link2 size={15} /> Unirme con código</button>
          <button className="primary" onClick={() => setShowCreate(!showCreate)} data-testid="create-subject-button"><Plus size={15} /> Crear asignatura</button>
        </div>
      </div>
      {showCreate && <CreateSubjectForm onCancel={() => setShowCreate(false)} onCreated={(created) => { setItems((current) => [created, ...current]); setShowCreate(false); }} />}
      {showJoin && (
        <form className="composer join-subject-form" onSubmit={join} data-testid="join-subject-form">
          <label className="field"><span>Código de unión</span><input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="Ej. A1B2C3D4" required data-testid="join-subject-code" /></label>
          <button className="primary" data-testid="submit-join-subject">Unirme</button>
        </form>
      )}
      {error && <div className="error" data-testid="subjects-error">{error}</div>}
      <div className="subject-grid large">
        {items.map((s) => (
          <div className={`subject-card ${s.color || "teal"}`} key={s.id} data-testid={`catalog-subject-${s.code}`}>
            <div className="subject-top"><span>{s.code}</span><span className="semester">Semestre {s.semester}</span></div>
            <h3>{s.name}</h3>
            <p>{s.creator_name ? `Creada por ${s.creator_name} · ${roleLabel(s.creator_role)}` : s.professor}</p>
            <small>{s.program}</small>
            <button className="card-link" onClick={() => nav(`/asignaturas/${s.id}`)} data-testid={`open-subject-${s.code}`}>Ver asignatura <ArrowRight size={15} /></button>
          </div>
        ))}
      </div>
    </section>
  );
}
