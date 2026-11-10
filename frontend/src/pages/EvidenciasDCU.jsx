import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Lightbulb,
  Palette,
  Table2,
  LayoutDashboard,
  MessageSquareText,
  BookOpen,
  CalendarDays,
  Smartphone,
  ArrowRight,
  X,
  UserRound,
  Bot,
  Trophy,
  Newspaper,
} from "lucide-react";
import { AccessibilityMark } from "@/lib/nav";
import PropuestaTab from "@/components/evidencias/PropuestaTab";
import HeuristicasTab from "@/components/evidencias/HeuristicasTab";
import NecesidadesTab from "@/components/evidencias/NecesidadesTab";

const DOCUMENTATION_TABS = [
  { key: "propuesta", label: "Propuesta y pantallas", icon: Lightbulb, component: PropuestaTab },
  { key: "hci", label: "Análisis HCI", icon: Palette, component: HeuristicasTab },
  { key: "necesidades", label: "Necesidades", icon: Table2, component: NecesidadesTab },
];

const GUIDE_ITEMS = [
  {
    step: "01",
    title: "Empieza en Inicio",
    text: "Consulta tus resúmenes, avisos y accesos a las herramientas institucionales. Cada servicio puede abrirse por separado.",
    to: "/inicio",
    action: "Abrir Inicio",
    icon: LayoutDashboard,
  },
  {
    step: "02",
    title: "Espacios y catálogo UAO",
    text: "Mis espacios reúne tus comunidades; el catálogo muestra materias oficiales por programa y distingue las electivas del plan.",
    to: "/asignaturas?vista=catalogo",
    action: "Abrir catálogo UAO",
    icon: BookOpen,
  },
  {
    step: "03",
    title: "Publica o responde una duda",
    text: "Busca preguntas por tema, abre una para revisar sus respuestas o usa Nueva duda para compartir una pregunta con la comunidad.",
    to: "/dudas",
    action: "Abrir Dudas",
    icon: MessageSquareText,
  },
  {
    step: "04",
    title: "Solicita una asesoría",
    text: "Explora los espacios y consulta tema, horario y cupos. Cambia entre Calendario y Lista para revisar tus reservas y su historial.",
    to: "/asesorias",
    action: "Ver asesorías",
    icon: CalendarDays,
  },
  {
    step: "05",
    title: "Conversa en el chat",
    text: "Abre el chat general o el de una asignatura para revisar mensajes y participar en la conversación disponible.",
    to: "/chat",
    action: "Abrir Chat",
    icon: MessageSquareText,
  },
  {
    step: "06",
    title: "Consulta el asistente IA",
    text: "Haz preguntas académicas y consulta la respuesta del asistente. Revisa la información antes de usarla en tus trabajos.",
    to: "/asistente-ia",
    action: "Abrir Asistente IA",
    icon: Bot,
  },
  {
    step: "07",
    title: "Reconocimientos de la comunidad",
    text: "Consulta el podio y las contribuciones destacadas de monitores y participantes.",
    to: "/ranking",
    action: "Ver reconocimientos",
    icon: Trophy,
  },
  {
    step: "08",
    title: "Explora Vida UAO",
    text: "Encuentra enlaces a noticias, eventos, biblioteca y al formulario para reportar problemas o enviar sugerencias.",
    to: "/vida-uao",
    action: "Abrir Vida UAO",
    icon: Newspaper,
  },
  {
    step: "09",
    title: "Ajusta la accesibilidad",
    text: "En Configuración puedes adaptar contraste, tamaño de texto, movimiento, foco, controles y sonidos.",
    to: "/configuracion",
    action: "Abrir Configuración",
    icon: AccessibilityMark,
  },
  {
    step: "10",
    title: "Completa tu perfil",
    text: "Desde Mi perfil puedes editar tu descripción, datos académicos y enlaces. En móvil, abre Mi perfil desde el avatar de la barra superior.",
    to: "/perfil",
    action: "Abrir Mi perfil",
    icon: UserRound,
  },
];

function TutorialView() {
  const [showMobileNote, setShowMobileNote] = useState(true);
  return (
    <div className="tutorial-view" data-testid="navigation-tutorial">
      <div className="tutorial-intro">
        <h2>Empieza por la tarea que necesitas</h2>
        <p>Pasos breves para recorrer UAO Conecta y encontrar sus funciones principales.</p>
      </div>
      <div className="tutorial-grid">
        {GUIDE_ITEMS.map((item) => (
          <article className="tutorial-card" key={item.step}>
            <div className="tutorial-card-head">
              <span className="tutorial-step">{item.step}</span>
              <span className="tutorial-icon"><item.icon size={18} aria-hidden="true" /></span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            <Link className="tutorial-link" to={item.to}>
              {item.action} <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
      {showMobileNote && (
        <aside className="tutorial-mobile-note" aria-label="Navegación desde el móvil" data-testid="tutorial-mobile-note">
          <Smartphone size={18} aria-hidden="true" />
          <p><strong>En móvil:</strong> desliza la barra inferior para recorrer Inicio, Dudas, Asignaturas, Asesorías, Chat, IA, Reconocimientos, Vida UAO, Guía y Configuración. Usa el avatar superior para abrir Mi perfil.</p>
          <button type="button" className="tutorial-note-close" aria-label="Cerrar aviso de navegación móvil" onClick={() => setShowMobileNote(false)} data-testid="close-tutorial-mobile-note">
            <X size={16} aria-hidden="true" />
          </button>
        </aside>
      )}
    </div>
  );
}

function DocumentationView() {
  const [active, setActive] = useState("propuesta");
  const currentTab = DOCUMENTATION_TABS.find((tab) => tab.key === active);
  const Current = currentTab.component;

  return (
    <section className="academic-documentation" data-testid="academic-documentation">
      <div className="tutorial-intro">
        <h2>Documentación académica</h2>
        <p>Propuesta, análisis HCI y trazabilidad del diseño del proyecto.</p>
      </div>
      <div className="tabs ev-tabs" role="group" aria-label="Secciones de documentación académica">
        {DOCUMENTATION_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-pressed={active === tab.key}
            className={`tab ${active === tab.key ? "active" : ""}`}
            onClick={() => setActive(tab.key)}
            data-testid={`ev-tab-button-${tab.key}`}
          >
            <tab.icon size={15} aria-hidden="true" /> {tab.label}
          </button>
        ))}
      </div>
      <div className="reveal" key={active} data-testid="ev-tabpanel">
        <Current />
      </div>
    </section>
  );
}

export default function EvidenciasDCU() {
  const [section, setSection] = useState("tutorial");

  return (
    <section className="page evidencias-page" data-testid="evidencias-page">
      <div className="page-head reveal">
        <div>
          <p className="eyebrow">UAO CONECTA · GUÍA DE USO</p>
          <h1>Tutorial de navegación</h1>
          <p className="lede">Encuentra una función y sigue los pasos para usarla.</p>
        </div>
      </div>
      <div className="tabs ev-tabs" role="group" aria-label="Tutorial o documentación académica">
        <button
          type="button"
          aria-pressed={section === "tutorial"}
          className={`tab ${section === "tutorial" ? "active" : ""}`}
          onClick={() => setSection("tutorial")}
          data-testid="tutorial-tab"
        >
          Tutorial de navegación
        </button>
        <button
          type="button"
          aria-pressed={section === "documentation"}
          className={`tab ${section === "documentation" ? "active" : ""}`}
          onClick={() => setSection("documentation")}
          data-testid="documentation-tab"
        >
          Documentación académica
        </button>
      </div>
      <div className="reveal" key={section}>
        {section === "tutorial" ? <TutorialView /> : <DocumentationView />}
      </div>
    </section>
  );
}
