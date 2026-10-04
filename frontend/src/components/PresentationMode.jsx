import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, X, PlayCircle } from "lucide-react";
import ForgotPasswordModal from "@/components/auth/ForgotPasswordModal";

const STEPS = [
  {
    title: "Dashboard & Identidad UAO 2026",
    desc: "Una sola sesión @uao.edu.co y las métricas clave del semestre, con la identidad visual UAO 2026.",
    time: "0:45",
    route: "/inicio",
    selector: ".stats",
  },
  {
    title: "Asistente IA con persistencia",
    desc: "El asistente responde con IA y la conversación se conserva al navegar (sessionStorage).",
    time: "0:45",
    route: "/asistente-ia",
    selector: "[data-testid='ai-chat']",
  },
  {
    title: "Evidencias DCU y Lightbox",
    desc: "Cada necesidad enlaza con su captura real; haz clic en una imagen para ampliarla.",
    time: "0:40",
    route: "/evidencias-dcu",
    selector: "[data-testid='flow-carousel']",
  },
  {
    title: "Capa de integración y personalización docente",
    desc: "Comunicación, foros y soporte en un lugar. Los docentes pueden personalizar los enlaces.",
    time: "0:40",
    route: "/inicio",
    selector: "[data-testid='ecosystem-layer']",
  },
  {
    title: "Recuperación de contraseña",
    desc: "Demostración del correo institucional de recuperación con token y expiración de 15 minutos.",
    time: "0:40",
    route: null,
    selector: null,
    forgot: true,
  },
];

/* Modo Presentación: recorrido guiado de ~3:30 en 5 pasos, con resaltado y navegación. */
export default function PresentationMode({ open, onClose }) {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [forgot, setForgot] = useState(false);
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
      setForgot(false);
      return undefined;
    }
    const s = STEPS[step];
    clearHighlight();
    setForgot(Boolean(s.forgot));
    if (s.route) nav(s.route);
    if (!s.selector) return undefined;

    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      const el = document.querySelector(s.selector);
      if (el) {
        el.classList.add("tour-highlight");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        highlightRef.current = el;
        clearInterval(timer);
      } else if (tries > 14) {
        clearInterval(timer);
      }
    }, 150);
    return () => clearInterval(timer);
  }, [open, step, nav]);

  useEffect(() => () => clearHighlight(), []);

  const close = useCallback(() => {
    clearHighlight();
    setForgot(false);
    onClose();
  }, [onClose]);

  if (!open) return null;

  const s = STEPS[step];
  const pct = ((step + 1) / STEPS.length) * 100;
  const last = step === STEPS.length - 1;

  return (
    <>
      <div className="tour-banner" role="region" aria-label="Modo presentación" data-testid="presentation-banner">
        <div className="tour-progress" style={{ width: `${pct}%` }} aria-hidden="true" />
        <div className="tour-step-badge">
          <span><PlayCircle size={16} aria-hidden="true" /> Paso {step + 1} de {STEPS.length}</span>
          <em>Sugerido: {s.time} min</em>
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
      <ForgotPasswordModal open={forgot} onClose={() => setForgot(false)} />
    </>
  );
}
