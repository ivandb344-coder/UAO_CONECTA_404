import { useEffect, useMemo, useState } from "react";
import { X, Save } from "lucide-react";
import { api } from "@/lib/api";
import { SEMESTERS } from "@/lib/programs";

function fieldError(errors, key) {
  return errors[key] ? <span className="field-error">{errors[key]}</span> : null;
}

export default function CreateSubjectForm({ onCreated, onCancel }) {
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    program: "",
    semester: "",
    schedule: "",
    additional_info: "",
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/programs").then((response) => setPrograms(response.data)).catch(() => setMessage("No pudimos cargar los programas académicos."));
  }, []);

  const grouped = useMemo(() => programs.reduce((groups, item) => {
    groups[item.group] = groups[item.group] || [];
    groups[item.group].push(item.name);
    return groups;
  }, {}), [programs]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setMessage("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage("");
    try {
      const response = await api.post("/subjects", { ...form, code: form.code.trim().toUpperCase(), semester: Number(form.semester) });
      onCreated(response.data);
    } catch (error) {
      const detail = error.response?.data?.detail;
      if (detail?.fields) setErrors(detail.fields);
      else setMessage(typeof detail === "string" ? detail : "No pudimos crear la asignatura.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="composer subject-create-form" onSubmit={submit} data-testid="create-subject-form">
      <div className="section-title">
        <div>
          <p className="eyebrow">NUEVA · COMUNIDAD ACADÉMICA</p>
          <h2>Crear asignatura</h2>
        </div>
        {onCancel && <button type="button" className="icon-mini" onClick={onCancel} aria-label="Cerrar"><X size={16} /></button>}
      </div>
      {message && <div className="error">{message}</div>}
      <div className="task-fields">
        <label className="field">
          <span>Nombre</span>
          <input data-testid="subject-name-input" value={form.name} onChange={(event) => update("name", event.target.value)} className={errors.name ? "invalid" : ""} required />
          {fieldError(errors, "name")}
        </label>
        <label className="field">
          <span>Código</span>
          <input data-testid="subject-code-input" value={form.code} onChange={(event) => update("code", event.target.value)} className={errors.code ? "invalid" : ""} placeholder="INF301" required />
          {fieldError(errors, "code")}
        </label>
      </div>
      <label className="field">
        <span>Descripción</span>
        <textarea data-testid="subject-description-input" value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="¿Qué aprenderán en esta asignatura?" />
      </label>
      <div className="task-fields">
        <label className="field">
          <span>Ingeniería / programa académico</span>
          <select data-testid="subject-program-input" value={form.program} onChange={(event) => update("program", event.target.value)} className={errors.program ? "invalid" : ""} required>
            <option value="">— Selecciona —</option>
            {Object.entries(grouped).map(([group, list]) => <optgroup key={group} label={group}>{list.map((name) => <option key={name} value={name}>{name}</option>)}</optgroup>)}
          </select>
          {fieldError(errors, "program")}
        </label>
        <label className="field">
          <span>Semestre</span>
          <select data-testid="subject-semester-input" value={form.semester} onChange={(event) => update("semester", event.target.value)} className={errors.semester ? "invalid" : ""} required>
            <option value="">— Selecciona —</option>
            {SEMESTERS.map((semester) => <option key={semester} value={semester}>{semester}° semestre</option>)}
          </select>
          {fieldError(errors, "semester")}
        </label>
      </div>
      <div className="task-fields">
        <label className="field">
          <span>Horario</span>
          <input data-testid="subject-schedule-input" value={form.schedule} onChange={(event) => update("schedule", event.target.value)} placeholder="Martes y jueves · 7:00 a.m." />
        </label>
        <label className="field">
          <span>Información adicional</span>
          <input data-testid="subject-additional-input" value={form.additional_info} onChange={(event) => update("additional_info", event.target.value)} placeholder="Salón, modalidad o recomendaciones" />
        </label>
      </div>
      <div className="form-actions">
        {onCancel && <button type="button" className="ghost" onClick={onCancel}>Cancelar</button>}
        <button className="primary" disabled={busy} data-testid="submit-subject-button"><Save size={15} /> {busy ? "Guardando…" : "Guardar asignatura"}</button>
      </div>
    </form>
  );
}
