import { PROGRAM_NAMES, SEMESTERS } from "@/lib/programs";

const FieldError = ({ id, text }) =>
  text ? <span className="field-error" role="alert" data-testid={id}>{text}</span> : null;

/* Campos de registro. El rol NO se elige: lo asigna el directorio institucional. */
export default function RegisterFields({ form, setForm, fieldErrors, clearError, isProfessor }) {
  const update = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    clearError(key);
  };
  return (
    <>
      <label>
        Nombre completo
        <input data-testid="register-name-input" required autoComplete="name" value={form.name} onChange={update("name")} />
        <FieldError id="register-name-error" text={fieldErrors.name} />
      </label>
      <label>
        Usuario
        <input
          data-testid="register-username-input"
          required
          minLength={3}
          autoComplete="username"
          aria-invalid={!!fieldErrors.username}
          value={form.username}
          onChange={update("username")}
          placeholder="ej. daniel.r"
        />
        <FieldError id="register-username-error" text={fieldErrors.username} />
      </label>
      <label>
        Programa académico
        <select data-testid="register-program-select" value={form.program} onChange={update("program")}>
          {PROGRAM_NAMES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <FieldError id="register-program-error" text={fieldErrors.program} />
      </label>
      {!isProfessor && (
        <label>
          Semestre
          <select data-testid="register-semester-select" value={form.semester} aria-invalid={!!fieldErrors.semester} onChange={update("semester")}>
            {SEMESTERS.map((s) => <option key={s} value={s}>{s}° semestre</option>)}
          </select>
          <FieldError id="register-semester-error" text={fieldErrors.semester} />
        </label>
      )}
      <p className="field-hint" data-testid="register-role-hint">
        Tu rol se asigna automáticamente al verificar tu correo contra el directorio docente de la Facultad de Ingeniería.
      </p>
    </>
  );
}
