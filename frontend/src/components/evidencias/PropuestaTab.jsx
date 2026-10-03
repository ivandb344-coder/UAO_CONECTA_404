import { Layers, Link2, ShieldCheck, Users } from "lucide-react";
import FlowCarousel from "@/components/evidencias/FlowCarousel";
import { FLOW } from "@/lib/evidencias";

const PILLARS = [
  { icon: Link2, title: "Capa, no silo", text: "El Hub lee Moodle, Teams y Banner con la sesión institucional y los muestra en un solo Inicio. No pide migrar cursos ni duplicar contenido." },
  { icon: Users, title: "Lo que ninguna plataforma ofrece", text: "Rutas de apoyo visibles (docente, monitor, horario), dudas asíncronas con anonimato y coordinación del grupo por asignatura." },
  { icon: ShieldCheck, title: "Identidad verificada", text: "Solo correos @uao.edu.co. El rol docente se asigna desde el directorio de la Facultad de Ingeniería: el usuario no puede equivocarse." },
];

export default function PropuestaTab() {
  return (
    <div className="ev-tab" data-testid="ev-tab-propuesta">
      <div className="ev-statement">
        <p className="eyebrow">PROPUESTA DE VALOR</p>
        <h2>Consolidar lo que ya existe, en lugar de crear otro silo</h2>
        <p className="lede">
          La indagación mostró que el 30,8 % de los estudiantes revisa demasiados medios y el 25 % no sabe a quién acudir.
          La respuesta no es una sexta plataforma: es una <b>capa de integración</b> que une los sistemas institucionales con el
          apoyo académico entre pares bajo una sola identidad UAO.
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
        <p className="eyebrow">PROTOTIPO · FLUJO PRINCIPAL</p>
        <h3>De la verificación institucional al tablero unificado</h3>
      </div>
      <FlowCarousel slides={FLOW} />
    </div>
  );
}
