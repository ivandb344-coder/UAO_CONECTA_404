import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, X, PlayCircle } from "lucide-react";

const STEPS = [
  {
    title: "Inicio y herramientas",
    desc: "Encuentra tus accesos institucionales y el resumen de actividad del Hub.",
    time: "30 s",
    route: "/inicio",
    selector: "[data-testid='integration-layer']",
  },
  {
    title: "Asignaturas y catálogo UAO",
    desc: "Separa tus espacios colaborativos del catálogo de materias y consulta las fuentes oficiales por programa.",
    time: "30 s",
    route: "/asignaturas",
    selector: "[data-testid='subjects-page']",
  },
  {
    title: "Dudas de la comunidad",
    desc: "Busca preguntas, consulta sus respuestas o publica una duda nueva.",
    time: "30 s",
    route: "/dudas",
    selector: "[data-testid='questions-page']",
  },
  {
    title: "Asesorías y agenda",
    desc: "Explora espacios, solicita una asesoría y cambia entre Calendario y Lista para revisar reservas e historial.",
    time: "30 s",
    route: "/asesorias",
    selector: "[data-testid='advisories-page']",
  },
  {
    title: "Chat de campus",
    desc: "Abre la conversación general o el canal de una asignatura y revisa los mensajes disponibles.",
    time: "30 s",
    route: "/chat",
    selector: "[data-testid='chat-page']",
  },
  {
    title: "Tu perfil",
    desc: "Actualiza tu presentación, información académica y enlaces. En móvil, abre Mi perfil desde el avatar superior.",
    time: "30 s",
    route: "/perfil",
    selector: "[data-testid='profile-page']",
  },
];

/* Recorrido guiado por las pantallas actuales del Hub. */
export default function PresentationMode({ open, onClose }) {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const highlightRef = useRef(null);

  const clearHighlight = () => {
    if (highlightRef.current) {
      highlightRef.current.classList.remove("tour-highlight");
      highlightRef.current = null;
    }
  };

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) {
      clearHighlight();
      return undefined;
    }
    const s = STEPS[step];
    clearHighlight();
    if (s.route) nav(s.route);
    if (!s.selector) return undefined;

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const el = document.querySelector(s.selector);
      if (el) {
        el.classList.add("tour-highlight");
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
          || document.documentElement.classList.contains("a11y-reduced-motion")
          || document.documentElement.classList.contains("a11y-no-anim");
        el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
        highlightRef.current = el;
        clearInterval(timer);
      } else if (tries > 59) {
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [open, step, nav]);

  useEffect(() => () => clearHighlight(), []);

  const close = useCallback(() => {
    clearHighlight();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  if (!open) return null;

  const s = STEPS[step];
  const pct = ((step + 1) / STEPS.length) * 100;
  const last = step === STEPS.length - 1;

  return (
    <>
      <div className="tour-banner" role="region" aria-label={`Tutorial guiado, paso ${step + 1} de ${STEPS.length}`} data-testid="presentation-banner">
        <div className="tour-progress" style={{ width: `${pct}%` }} role="progressbar" aria-label="Progreso del tutorial" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} />
        <div className="tour-step-badge">
          <span><PlayCircle size={16} aria-hidden="true" /> Paso {step + 1} de {STEPS.length}</span>
          <em>Tiempo sugerido: {s.time}</em>
        </div>
        <div className="tour-copy">
          <b data-testid="tour-step-title">{s.title}</b>
          <p>{s.desc}</p>
        </div>
        <div className="tour-controls">
          <button className="ghost" onClick={() => setStep((x) => Math.max(0, x - 1))} disabled={step === 0} data-testid="tour-prev">
            <ChevronLeft size={16} aria-hidden="true" /> Anterior
          </button>
          {last ? (
            <button className="primary" onClick={close} data-testid="tour-finish">
              Finalizar
            </button>
          ) : (
            <button className="primary" onClick={() => setStep((x) => Math.min(STEPS.length - 1, x + 1))} data-testid="tour-next">
              Siguiente <ChevronRight size={16} aria-hidden="true" />
            </button>
          )}
          <button className="tour-exit" onClick={close} data-testid="tour-exit" aria-label="Salir del modo presentación">
            <X size={16} aria-hidden="true" /> Salir
          </button>
        </div>
      </div>
    </>
  );
}
