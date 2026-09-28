import { useNavigate } from "react-router-dom";
import { Edit3, ShieldCheck } from "lucide-react";
import { roleLabel } from "@/lib/nav";
import AccessibilityPanel from "@/components/settings/AccessibilityPanel";

export default function Settings({ user }) {
  const nav = useNavigate();
  return (
    <section className="page settings-page" data-testid="settings-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">CONFIGURACIÓN</p>
          <h1>Tu cuenta, a tu medida</h1>
          <p className="lede">Revisa los datos de tu sesión y ajusta la accesibilidad de la plataforma.</p>
        </div>
      </div>

      <section className="settings-section" aria-labelledby="session-heading" data-testid="settings-session">
        <p className="eyebrow">SESIÓN</p>
        <h2 id="session-heading">Datos de tu cuenta</h2>
        <p>Tu rol y programa quedaron asociados a tu cuenta al registrarte y se mantienen en cada inicio de sesión.</p>
        <div className="settings-summary">
          <div><small>Nombre de usuario</small><span data-testid="settings-username">@{user.username}</span></div>
          <div><small>Correo electrónico</small><span data-testid="settings-email">{user.email}</span></div>
          <div><small>Rol</small><span data-testid="settings-role"><ShieldCheck size={12} aria-hidden="true" /> {roleLabel(user.role)}</span></div>
          <div><small>Programa académico</small><span data-testid="settings-program">{user.program}{user.semester ? ` · ${user.semester}° semestre` : ""}</span></div>
        </div>
        <button className="ghost small" style={{ marginTop: 16 }} onClick={() => nav("/perfil/editar")} data-testid="settings-edit-profile">
          <Edit3 size={13} aria-hidden="true" /> Editar información del perfil
        </button>
      </section>

      <AccessibilityPanel />
    </section>
  );
}
