import { useNavigate } from "react-router-dom";
import { CalendarPlus, MessageSquareText, ClipboardCheck, ArrowRight } from "lucide-react";

/* Panel que aparece cuando el estudiante activa el Modo Monitor: acciones de acompañamiento. */
export default function MonitorPanel() {
  const nav = useNavigate();
  const actions = [
    { icon: CalendarPlus, label: "Publicar asesoría", hint: "Define día, hora, modalidad y cupos.", to: "/asesorias", id: "advisory" },
    { icon: MessageSquareText, label: "Responder dudas", hint: "Dudas abiertas en tus asignaturas.", to: "/dudas", id: "questions" },
    { icon: ClipboardCheck, label: "Revisar entregas", hint: "Bandeja de revisión con retroalimentación.", to: "/revisiones", id: "reviews" },
  ];
  return (
    <section className="monitor-panel reveal" aria-labelledby="monitor-panel-title" data-testid="monitor-panel">
      <div>
        <p className="eyebrow light">MODO MONITOR</p>
        <h3 id="monitor-panel-title">Hoy acompañas a tu asignatura</h3>
        <p>Tu disponibilidad y tu área de conocimiento quedan visibles en la ruta de apoyo de los estudiantes.</p>
      </div>
      <div className="monitor-actions">
        {actions.map((a) => (
          <button key={a.id} onClick={() => nav(a.to)} data-testid={`monitor-action-${a.id}`}>
            <a.icon size={18} aria-hidden="true" />
            <span><b>{a.label}</b><small>{a.hint}</small></span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
