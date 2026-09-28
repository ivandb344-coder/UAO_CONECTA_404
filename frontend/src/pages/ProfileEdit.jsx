import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Camera, Trash2, Eye, EyeOff, Plus, Save, Check } from "lucide-react";
import { api } from "@/lib/api";
import { PLATFORMS, platformMeta } from "@/lib/platforms";
import { Loading } from "@/components/ui/states";
import { useProtectedFileUrl } from "@/hooks/useProtectedFile";
import { storagePathFromFileUrl } from "@/services/fileService";

const ROLE_OPTIONS = [
  { value: "student", label: "Estudiante" },
  { value: "monitor", label: "Monitor" },
  { value: "professor", label: "Profesor" },
];

function fieldError(errors, key) {
  return errors[key] ? <span className="field-error" data-testid={`err-${key}`}>{errors[key]}</span> : null;
}

export default function ProfileEdit({ me, onUpdate }) {
  const nav = useNavigate();
  const fileRef = useRef(null);
  const [programs, setPrograms] = useState([]);
  const [form, setForm] = useState({
    name: me.name || "",
    username: me.username || "",
    role: me.role || "",
    program: me.program || "",
    semester: me.semester || "",
    bio: me.bio || "",
    phone: me.phone || "",
    contact_info: me.contact_info || "",
    academic_info: me.academic_info || "",
    picture: me.picture || "",
  });
  const [links, setLinks] = useState(me.links || []);
  const protectedPicture = storagePathFromFileUrl(form.picture);
  const protectedPictureUrl = useProtectedFileUrl(protectedPicture);
  const pictureSrc = protectedPicture ? protectedPictureUrl : form.picture;
  const [errors, setErrors] = useState({});
  const [remoteMsg, setRemoteMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newLink, setNewLink] = useState({ platform: "linkedin", url: "", label: "", icon: "" });
  const [linkErrors, setLinkErrors] = useState({});

  useEffect(() => {
    api.get("/programs").then((r) => setPrograms(r.data));
  }, []);

  const grouped = useMemo(() => {
    const map = {};
    for (const p of programs) (map[p.group] = map[p.group] || []).push(p.name);
    return map;
  }, [programs]);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => {
      if (!e[k]) return e;
      const c = { ...e };
      delete c[k];
      return c;
    });
    setSaved(false);
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "El nombre visible no puede quedar vacío.";
    if (!form.username.trim()) next.username = "El nombre de usuario es obligatorio.";
    else if (form.username.trim().length < 3) next.username = "El nombre de usuario debe tener al menos 3 caracteres.";
    if (!form.role) next.role = "Selecciona un rol: Estudiante, Monitor o Profesor.";
    if (!form.program) next.program = "Selecciona tu programa académico.";
    if (form.role === "student" && !form.semester) next.semester = "Selecciona tu semestre.";
    return next;
  };

  const submit = async (e) => {
    e.preventDefault();
    setRemoteMsg("");
    const local = validate();
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }
    setBusy(true);
    try {
      const payload = { ...form, username: form.username.trim().toLowerCase() };
      if (payload.semester) payload.semester = parseInt(payload.semester, 10);
      else delete payload.semester;
      delete payload.picture; // photo is already saved via /profile/photo
      const r = await api.patch("/profile/me", payload);
      onUpdate(r.data);
      setSaved(true);
    } catch (x) {
      const detail = x.response?.data?.detail;
      if (detail && typeof detail === "object" && detail.fields) setErrors(detail.fields);
      else setRemoteMsg(typeof detail === "string" ? detail : "No pudimos guardar los cambios.");
    }
    setBusy(false);
  };

  const uploadPhoto = async (evt) => {
    const file = evt.target.files?.[0];
    evt.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setRemoteMsg("La foto no puede pesar más de 5MB.");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await api.post("/profile/photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      set("picture", r.data.picture);
      onUpdate({ ...me, picture: r.data.picture });
    } catch {
      setRemoteMsg("No pudimos subir la foto, intenta de nuevo.");
    }
  };

  const addLink = async () => {
    setLinkErrors({});
    try {
      const r = await api.post("/profile/links", newLink);
      setLinks((l) => [...l, r.data]);
      setNewLink({ platform: "linkedin", url: "", label: "", icon: "" });
    } catch (x) {
      const d = x.response?.data?.detail;
      if (d?.fields) setLinkErrors(d.fields);
      else setRemoteMsg("No pudimos agregar el enlace.");
    }
  };

  const updateLink = async (link, patch) => {
    try {
      const r = await api.patch(`/profile/links/${link.id}`, patch);
      setLinks((l) => l.map((x) => (x.id === link.id ? { ...x, ...r.data } : x)));
    } catch (x) {
      const d = x.response?.data?.detail;
      if (d?.fields) setLinkErrors({ [`edit-${link.id}`]: d.fields.url || d.fields.platform || "Datos inválidos" });
    }
  };

  const removeLink = async (link) => {
    if (!window.confirm(`¿Eliminar el enlace ${platformMeta(link.platform).label}?`)) return;
    try {
      await api.delete(`/profile/links/${link.id}`);
      setLinks((l) => l.filter((x) => x.id !== link.id));
    } catch {
      setRemoteMsg("No pudimos eliminar el enlace.");
    }
  };

  if (!me) return <Loading label="Cargando…" />;

  return (
    <section className="page profile-edit" data-testid="profile-edit-page">
      <button className="back-link" onClick={() => nav("/perfil")}>
        <ArrowRight size={13} className="back-icon" /> Mi perfil
      </button>
      <div className="page-head">
        <div>
          <p className="eyebrow">CUENTA · PERFIL</p>
          <h1>Editar perfil</h1>
          <p className="lede">Actualiza tu información académica, tus redes y cómo te ven los demás.</p>
        </div>
        {saved && (
          <span className="save-badge" data-testid="save-badge">
            <Check size={13} /> Guardado
          </span>
        )}
      </div>

      {remoteMsg && <div className="error" data-testid="profile-edit-error">{remoteMsg}</div>}

      <form className="profile-form" onSubmit={submit}>
        <div className="photo-row">
          <div className="profile-avatar big" data-testid="edit-avatar">
            {pictureSrc ? <img src={pictureSrc} alt="Foto de perfil" /> : <span>{form.name?.[0] || "?"}</span>}
          </div>
          <div>
            <button type="button" className="ghost" onClick={() => fileRef.current?.click()} data-testid="upload-photo-button">
              <Camera size={14} /> {form.picture ? "Cambiar foto" : "Subir foto"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadPhoto} data-testid="photo-input" />
            <p className="muted small">JPG o PNG, máximo 5MB.</p>
          </div>
        </div>

        <div className="task-fields">
          <label className="field">
            <span>Nombre visible</span>
            <input
              data-testid="pe-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={errors.name ? "invalid" : ""}
            />
            {fieldError(errors, "name")}
          </label>
          <label className="field">
            <span>Nombre de usuario</span>
            <input
              data-testid="pe-username"
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              className={errors.username ? "invalid" : ""}
            />
            {fieldError(errors, "username")}
          </label>
        </div>

        <label className="field">
          <span>Rol</span>
          <div className="role-row">
            {ROLE_OPTIONS.map((r) => (
              <button
                type="button"
                key={r.value}
                onClick={() => set("role", r.value)}
                className={`role-chip ${form.role === r.value ? "active" : ""} ${errors.role ? "invalid" : ""}`}
                data-testid={`pe-role-${r.value}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {fieldError(errors, "role")}
        </label>

        <div className="task-fields">
          <label className="field">
            <span>Programa académico</span>
            <select
              data-testid="pe-program"
              value={form.program}
              onChange={(e) => set("program", e.target.value)}
              className={errors.program ? "invalid" : ""}
            >
              <option value="">— Selecciona —</option>
              {Object.entries(grouped).map(([group, list]) => (
                <optgroup key={group} label={group}>
                  {list.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {fieldError(errors, "program")}
          </label>
          {form.role === "student" && (
            <label className="field">
              <span>Semestre</span>
              <select
                data-testid="pe-semester"
                value={form.semester || ""}
                onChange={(e) => set("semester", e.target.value)}
                className={errors.semester ? "invalid" : ""}
              >
                <option value="">— Selecciona —</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}° semestre</option>
                ))}
              </select>
              {fieldError(errors, "semester")}
            </label>
          )}
        </div>

        <label className="field">
          <span>Biografía / descripción</span>
          <textarea
            data-testid="pe-bio"
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="Comparte en qué estás trabajando o qué te interesa…"
          />
        </label>

        <div className="task-fields">
          <label className="field">
            <span>Información académica</span>
            <input
              data-testid="pe-academic"
              value={form.academic_info}
              onChange={(e) => set("academic_info", e.target.value)}
              placeholder="Cursos que dictas o electivas de interés"
            />
          </label>
          <label className="field">
            <span>Información adicional de contacto</span>
            <input
              data-testid="pe-contact-info"
              value={form.contact_info}
              onChange={(e) => set("contact_info", e.target.value)}
              placeholder="Ciudad, horario de contacto o canal preferido"
            />
          </label>
        </div>

        <button className="primary wide" data-testid="pe-submit" disabled={busy}>
          <Save size={15} /> {busy ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      <section className="links-section" data-testid="links-section">
        <div className="section-title">
          <h2>Redes y plataformas</h2>
          <span>{links.length} enlaces</span>
        </div>

        <div className="link-editor">
          <div className="task-fields">
            <label className="field">
              <span>Plataforma</span>
              <select
                data-testid="nl-platform"
                value={newLink.platform}
                onChange={(e) => {
                  setNewLink((f) => ({ ...f, platform: e.target.value }));
                  setLinkErrors({});
                }}
              >
                {PLATFORMS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Etiqueta (opcional)</span>
              <input
                data-testid="nl-label"
                value={newLink.label}
                placeholder="Ej. Grupo del semestre"
                onChange={(e) => setNewLink((f) => ({ ...f, label: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Icono (emoji opcional)</span>
              <input
                data-testid="nl-icon"
                value={newLink.icon}
                placeholder="Ej. 🔗"
                maxLength={4}
                onChange={(e) => setNewLink((f) => ({ ...f, icon: e.target.value }))}
              />
            </label>
          </div>
          <label className="field">
            <span>URL</span>
            <input
              data-testid="nl-url"
              value={newLink.url}
              placeholder={platformMeta(newLink.platform).placeholder}
              onChange={(e) => setNewLink((f) => ({ ...f, url: e.target.value }))}
              className={linkErrors.url ? "invalid" : ""}
            />
            {linkErrors.url && <span className="field-error" data-testid="err-nl-url">{linkErrors.url}</span>}
          </label>
          <button type="button" className="ghost" onClick={addLink} data-testid="add-link-button">
            <Plus size={13} /> Agregar enlace
          </button>
        </div>

        <ul className="link-list edit" data-testid="edit-links-list">
          {links.map((l) => {
            const meta = platformMeta(l.platform);
            const Icon = meta.icon;
            return (
              <li key={l.id} className={l.visible === false ? "hidden" : ""} data-testid={`link-item-${l.id}`}>
                {l.icon ? <span className="link-custom-icon" aria-hidden="true">{l.icon}</span> : <Icon size={16} />}
                <div className="link-info">
                  <input
                    className="link-label-input"
                    value={l.label || ""}
                    placeholder={meta.label}
                    onChange={(e) => setLinks((all) => all.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x)))}
                    onBlur={(e) => updateLink(l, { label: e.target.value })}
                    data-testid={`link-label-${l.id}`}
                  />
                  <input
                    className="link-icon-input"
                    value={l.icon || ""}
                    placeholder="🔗"
                    maxLength={4}
                    onChange={(e) => setLinks((all) => all.map((x) => (x.id === l.id ? { ...x, icon: e.target.value } : x)))}
                    onBlur={(e) => updateLink(l, { icon: e.target.value })}
                    data-testid={`link-icon-${l.id}`}
                  />
                  <input
                    className={linkErrors[`edit-${l.id}`] ? "invalid" : ""}
                    value={l.url}
                    onChange={(e) => setLinks((all) => all.map((x) => (x.id === l.id ? { ...x, url: e.target.value } : x)))}
                    onBlur={(e) => updateLink(l, { url: e.target.value })}
                    data-testid={`link-url-${l.id}`}
                  />
                  {linkErrors[`edit-${l.id}`] && (
                    <span className="field-error">{linkErrors[`edit-${l.id}`]}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="icon-mini"
                  title={l.visible === false ? "Mostrar en perfil" : "Ocultar en perfil"}
                  onClick={() => updateLink(l, { visible: l.visible === false })}
                  data-testid={`link-toggle-${l.id}`}
                >
                  {l.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  type="button"
                  className="icon-mini danger"
                  title="Eliminar enlace"
                  onClick={() => removeLink(l)}
                  data-testid={`link-delete-${l.id}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </section>
  );
}
