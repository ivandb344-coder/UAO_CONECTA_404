import { Layers, Link2, ShieldCheck, Users, LayoutDashboard, BookOpen, CircleHelp, CalendarDays, MessageCircle, UserRound, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const PILLARS = [
  { icon: Link2, title: "Accesos en un solo lugar", text: "Inicio reúne accesos a Moodle, Teams, Banner y recursos académicos. Cada servicio conserva su propio proceso institucional de inicio de sesión." },
  { icon: Users, title: "Acompañamiento académico", text: "Dudas, chat por asignatura y asesorías ayudan a resolver preguntas y coordinar el apoyo entre estudiantes, monitores y docentes." },
  { icon: ShieldCheck, title: "Acceso claro y seguro", text: "UAO Conecta admite Google institucional o una cuenta manual propia. La contraseña de UAO Conecta no sustituye las claves de Moodle, Banner u otros servicios." },
];

const CURRENT_SCREENS = [
  { step: "01", title: "Inicio", text: "Accesos institucionales, actividad y herramientas principales.", to: "/inicio", action: "Abrir Inicio", icon: LayoutDashboard },
  { step: "02", title: "Asignaturas y catálogo", text: "Separa tus espacios colaborativos del catálogo oficial por programa.", to: "/asignaturas?vista=catalogo", action: "Abrir catálogo UAO", icon: BookOpen },
  { step: "03", title: "Dudas", text: "Busca preguntas de la comunidad o publica una nueva.", to: "/dudas", action: "Abrir Dudas", icon: CircleHelp },
  { step: "04", title: "Asesorías", text: "Explora espacios, solicita cupo y revisa tus reservas en calendario o lista.", to: "/asesorias", action: "Abrir Asesorías", icon: CalendarDays },
  { step: "05", title: "Chat", text: "Consulta la conversación general y los canales disponibles.", to: "/chat", action: "Abrir Chat", icon: MessageCircle },
  { step: "06", title: "Perfil", text: "Edita tu descripción, información académica y enlaces.", to: "/perfil", action: "Abrir Mi perfil", icon: UserRound },
];

export default function PropuestaTab() {
  return (
    <div className="ev-tab" data-testid="ev-tab-propuesta">
      <div className="ev-statement">
        <p className="eyebrow">PROPUESTA DE VALOR</p>
        <h2>Consolidar lo que ya existe, en lugar de crear otro silo</h2>
        <p className="lede">
          UAO Conecta organiza en una sola interfaz los accesos académicos y las herramientas de acompañamiento entre pares.
          Cada sistema institucional conserva su autenticación y sus datos.
        </p>
      </div>
      <div className="ev-pillars">
        {PILLARS.map((p) => (
          <article key={p.title} className="ev-pillar" data-testid={`ev-pillar-${p.title.split(",")[0].toLowerCase().replaceAll(" ", "-")}`}>
            <span className="ev-pillar-icon"><p.icon size={18} aria-hidden="true" /></span>
            <b>{p.title}</b>
            <p>{p.text}</p>
          </article>
        ))}
      </div>
      <div className="ev-flow-map" aria-label="Diagrama de integración">
        {["Moodle", "Teams", "Banner"].map((s) => <span key={s} className={`ev-node sys-${s.toLowerCase()}`}>{s}</span>)}
        <span className="ev-arrow" aria-hidden="true">→</span>
        <span className="ev-node hub"><Layers size={14} aria-hidden="true" /> Hub UAO Conecta</span>
        <span className="ev-arrow" aria-hidden="true">→</span>
        <span className="ev-node out">Estudiante · Monitor · Docente</span>
      </div>
      <div className="ev-statement">
        <p className="eyebrow">PANTALLAS ACTUALES</p>
        <h3>Explora las funciones disponibles</h3>
        <p className="lede">Abre cada sección directamente. Estas tarjetas llevan a la versión vigente de la aplicación.</p>
      </div>
      <div className="ev-current-grid" data-testid="current-screen-links">
        {CURRENT_SCREENS.map((screen) => (
          <article className="ev-current-card" key={screen.step}>
            <div className="ev-current-card-head">
              <span className="ev-current-step">{screen.step}</span>
              <span className="ev-current-icon"><screen.icon size={18} aria-hidden="true" /></span>
            </div>
            <h4>{screen.title}</h4>
            <p>{screen.text}</p>
            <Link to={screen.to} className="ev-current-link" data-testid={`open-current-${screen.step}`}>
              {screen.action} <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
