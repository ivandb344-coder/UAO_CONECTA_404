import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

const ROLE_OPTIONS = [
  { value: "student", label: "Estudiante" },
  { value: "monitor", label: "Monitor" },
  { value: "professor", label: "Profesor" },
];

function fieldError(errors, key) {
  return errors[key] ? <span className="field-error" data-testid={`err-${key}`}>{errors[key]}</span> : null;
}

export default function CompleteProfile({ user, onDone }) {
  const nav = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState({
    name: user.name || "",
    username: user.username || "",
    role: user.role || "",
    program: user.program || "",
    semester: user.semester || "",
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [remoteMsg, setRemoteMsg] = useState("");

  useEffect(() => {
    api.get("/programs").then((r) => setPrograms(r.data));
  }, []);

  const grouped = useMemo(() => {
    const map = {};
    for (const p of programs) (map[p.group] = map[p.group] || []).push(p.name);
    return map;
  }, [programs]);

  const needsSemester = form.role === "student";

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => {
      if (!e[k]) return e;
      const c = { ...e };
      delete c[k];
      return c;
    });
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "El nombre visible no puede quedar vacío.";
    if (!form.username.trim()) next.username = "El nombre de usuario es obligatorio.";
    else if (form.username.trim().length < 3) next.username = "El nombre de usuario debe tener al menos 3 caracteres.";
    if (!form.role) next.role = "Selecciona un rol: Estudiante, Monitor o Profesor.";
    if (!form.program) next.program = "Selecciona tu programa académico.";
    if (needsSemester && !form.semester) next.semester = "Selecciona tu semestre.";
    return next;
  };

  const checkUsername = async () => {
    if (!form.username.trim() || form.username === user.username) return;
    try {
      const r = await api.get(`/profile/username-available?u=${encodeURIComponent(form.username.trim().toLowerCase())}`);
      if (!r.data.available) {
        setErrors((e) => ({ ...e, username: r.data.reason || "Este nombre de usuario ya está en uso." }));
      }
    } catch {
      /* ignore */
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setRemoteMsg("");
    const localErrors = validate();
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }
    setBusy(true);
    try {
      const payload = { ...form, username: form.username.trim().toLowerCase() };
      if (payload.semester) payload.semester = parseInt(payload.semester, 10);
      else delete payload.semester;
      const r = await api.patch("/profile/me", payload);
      onDone(r.data);
      nav("/inicio", { replace: true });
    } catch (x) {
      const detail = x.response?.data?.detail;
      if (detail && typeof detail === "object" && detail.fields) {
        setErrors(detail.fields);
      } else {
        setRemoteMsg(typeof detail === "string" ? detail : "No pudimos guardar tu perfil, intenta de nuevo.");
      }
    }
    setBusy(false);
  };

  return (
    <main className="complete-profile-shell">
      <form className="complete-profile-card" onSubmit={submit} data-testid="complete-profile-form">
        <div className="brand-mark">
          UAO <span>Conecta</span>
        </div>
        <p className="eyebrow"><Sparkles size={12} /> ÚLTIMO PASO</p>
        <h1>Completa tu perfil</h1>
        <p className="muted">
          Precargamos algunos datos desde tu cuenta de Google. Confirma el resto para llegar a tu Inicio.
        </p>

        {remoteMsg && <div className="error" data-testid="complete-profile-error">{remoteMsg}</div>}

        <label className="field">
          <span>Nombre visible</span>
          <input
            data-testid="cp-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={errors.name ? "invalid" : ""}
          />
          {fieldError(errors, "name")}
        </label>

        <label className="field">
          <span>Correo</span>
          <input value={user.email} disabled data-testid="cp-email" />
          <em className="hint">Este correo llegó desde Google y no puede cambiarse aquí.</em>
        </label>

        <label className="field">
          <span>Nombre de usuario</span>
          <input
            data-testid="cp-username"
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            onBlur={checkUsername}
            placeholder="ej. mariana.t"
            className={errors.username ? "invalid" : ""}
          />
          {fieldError(errors, "username")}
        </label>

        <label className="field">
          <span>Rol</span>
          <div className="role-row" data-testid="cp-roles">
            {ROLE_OPTIONS.map((r) => (
              <button
                type="button"
                key={r.value}
                onClick={() => set("role", r.value)}
                className={`role-chip ${form.role === r.value ? "active" : ""} ${errors.role ? "invalid" : ""}`}
                data-testid={`cp-role-${r.value}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {fieldError(errors, "role")}
        </label>

        <label className="field">
          <span>Programa académico</span>
          <select
            data-testid="cp-program"
            value={form.program}
            onChange={(e) => set("program", e.target.value)}
            className={errors.program ? "invalid" : ""}
          >
            <option value="">— Selecciona tu programa —</option>
            {Object.entries(grouped).map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {fieldError(errors, "program")}
        </label>

        {needsSemester && (
          <label className="field">
            <span>Semestre</span>
            <select
              data-testid="cp-semester"
              value={form.semester || ""}
              onChange={(e) => set("semester", e.target.value)}
              className={errors.semester ? "invalid" : ""}
            >
              <option value="">— Selecciona tu semestre —</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}° semestre
                </option>
              ))}
            </select>
            {fieldError(errors, "semester")}
          </label>
        )}

        <button className="primary wide" data-testid="cp-submit" disabled={busy}>
          {busy ? "Guardando…" : "Entrar a mi espacio"} <ArrowRight size={16} />
        </button>
      </form>
    </main>
  );
}
