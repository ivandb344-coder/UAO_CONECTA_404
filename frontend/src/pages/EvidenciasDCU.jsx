import { useState } from "react";
import { Lightbulb, Palette, Table2 } from "lucide-react";
import PropuestaTab from "@/components/evidencias/PropuestaTab";
import HeuristicasTab from "@/components/evidencias/HeuristicasTab";
import NecesidadesTab from "@/components/evidencias/NecesidadesTab";

const TABS = [
  { key: "propuesta", label: "Propuesta de valor y prototipo", icon: Lightbulb, component: PropuestaTab },
  { key: "hci", label: "Análisis de conceptos HCI", icon: Palette, component: HeuristicasTab },
  { key: "necesidades", label: "Satisfacción de necesidades", icon: Table2, component: NecesidadesTab },
];

export default function EvidenciasDCU() {
  const [active, setActive] = useState("propuesta");
  const Current = TABS.find((t) => t.key === active).component;
  return (
    <section className="page evidencias-page" data-testid="evidencias-page">
      <div className="page-head reveal">
        <div>
          <p className="eyebrow">INTERACCIÓN HUMANO-COMPUTADOR · EQUIPO 404</p>
          <h1>Evidencias DCU</h1>
          <p className="lede">Cómo el Hub de Integración Estudiantil UAO aplica el Diseño Centrado en el Usuario: propuesta de valor, principios HCI y trazabilidad necesidad → requerimiento → interfaz.</p>
        </div>
      </div>
      <div className="tabs ev-tabs" role="tablist" aria-label="Secciones de evidencias">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={active === t.key} className={`tab ${active === t.key ? "active" : ""}`} onClick={() => setActive(t.key)} data-testid={`ev-tab-button-${t.key}`}>
            <t.icon size={15} aria-hidden="true" /> {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="reveal" key={active}>
        <Current />
      </div>
    </section>
  );
}
