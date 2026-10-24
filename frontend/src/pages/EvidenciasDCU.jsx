import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Lightbulb,
  Palette,
  Table2,
  LayoutDashboard,
  CircleHelp,
  MessageSquareText,
  BookOpen,
  CalendarDays,
  ExternalLink,
  Smartphone,
  ArrowRight,
  X,
} from "lucide-react";
import PropuestaTab from "@/components/evidencias/PropuestaTab";
import HeuristicasTab from "@/components/evidencias/HeuristicasTab";
import NecesidadesTab from "@/components/evidencias/NecesidadesTab";

const DOCUMENTATION_TABS = [
  { key: "propuesta", label: "Propuesta y prototipo", icon: Lightbulb, component: PropuestaTab },
  { key: "hci", label: "Análisis HCI", icon: Palette, component: HeuristicasTab },
  { key: "necesidades", label: "Necesidades", icon: Table2, component: NecesidadesTab },
];

const GUIDE_ITEMS = [
  {
    step: "01",
    title: "Recorre Inicio",
    text: "Consulta tus asignaturas, la actividad reciente y los accesos a sistemas institucionales desde un solo lugar.",
    to: "/inicio",
    action: "Abrir Inicio",
    icon: LayoutDashboard,
  },
  {
    step: "02",
    title: "Encuentra Dudas",
    text: "Abre Dudas desde la navegación. Allí puedes buscar preguntas y filtrar las que no tienen respuesta o ya fueron resueltas.",
    to: "/dudas",
    action: "Ir a Dudas",
    icon: CircleHelp,
  },
  {
    step: "03",
    title: "Pregunta o responde",
    text: "En Dudas, elige Nueva duda para publicar. Abre una pregunta para leerla y escribir una respuesta clara y respetuosa.",
    to: "/dudas",
    action: "Ver preguntas",
    icon: MessageSquareText,
  },
  {
    step: "04",
    title: "Consulta tus asignaturas",
    text: "Revisa las asignaturas disponibles. Para unirte a una, usa el código de unión que te comparte el docente.",
    to: "/asignaturas",
    action: "Ver asignaturas",
    icon: BookOpen,
  },
  {
    step: "05",
    title: "Solicita una asesoría",
    text: "En Explorar, consulta la asignatura, el tema, el horario y los cupos antes de enviar tu solicitud.",
    to: "/asesorias",
    action: "Ver asesorías",
    icon: CalendarDays,
  },
  {
    step: "06",
    title: "Abre tus herramientas",
    text: "En Inicio, usa Abrir para acceder a Moodle, Teams, correo, Piazza, WhatsApp o Banner/SINU.",
    to: "/inicio",
    action: "Ver herramientas",
    icon: ExternalLink,
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
          <p><strong>En móvil:</strong> usa la barra inferior para ir a Inicio, Dudas, Asignaturas, Asesorías, Chat o abrir esta Guía.</p>
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
