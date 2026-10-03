import { useState } from "react";
import { ArrowRight, ExternalLink, XCircle } from "lucide-react";
import { LOGO_UAO } from "@/lib/assets";
import { HEURISTICS, HIGHLIGHTED, PALETTE } from "@/lib/evidencias";

/* Ejemplos vivos: la heurística se demuestra con el componente real, no con una captura. */
function LiveExamples() {
  const [email, setEmail] = useState("ana@gmail.com");
  const [on, setOn] = useState(true);
  const invalid = !/@uao\.edu\.co$/i.test(email);
  return (
    <div className="ev-live" data-testid="ev-live-examples">
      <div className="ev-live-item">
        <small>Affordance · botón primario y secundario</small>
        <div className="ev-live-row">
          <button className="primary" type="button" data-testid="ev-live-primary">Ingresar al Hub <ArrowRight size={15} aria-hidden="true" /></button>
          <button className="ghost" type="button">Crear asignatura</button>
          <a className="sys-cta" href="#/evidencias-dcu" onClick={(e) => e.preventDefault()}>Abrir Moodle <ExternalLink size={13} aria-hidden="true" /></a>
        </div>
      </div>
      <div className="ev-live-item">
        <small>Prevención de errores · validación en línea</small>
        <label className="ev-live-field">
          Correo institucional
          <input value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={invalid} data-testid="ev-live-email" />
          {invalid && <span className="identity-badge rejected"><XCircle size={13} aria-hidden="true" /> Solo se permiten correos institucionales @uao.edu.co.</span>}
        </label>
      </div>
      <div className="ev-live-item">
        <small>Control del usuario · interruptor reversible</small>
        <div className="monitor-toggle compact">
          <div className="monitor-toggle-text"><b>Modo Monitor</b></div>
          <button type="button" role="switch" aria-checked={on} className="switch-btn" onClick={() => setOn(!on)} aria-label="Ejemplo de interruptor" data-testid="ev-live-switch" />
        </div>
      </div>
    </div>
  );
}

export default function HeuristicasTab() {
  return (
    <div className="ev-tab" data-testid="ev-tab-heuristicas">
      <div className="ev-statement">
        <p className="eyebrow">MANUAL DE IDENTIDAD UAO 2026</p>
        <h2>Sistema de diseño aplicado</h2>
        <p className="lede">Paleta, tipografía y logo del manual institucional, verificados con contraste WCAG 2.1 AA.</p>
      </div>
      <div className="ev-manual">
        <div className="ev-swatches" data-testid="ev-swatches">
          {PALETTE.map((c) => (
            <div className="ev-swatch" key={c.hex}>
              <span className="ev-chip" style={{ background: c.hex, color: c.hex === "#FFFFFF" || c.hex === "#F8FAFC" ? "#1E293B" : "#fff" }}>{c.hex}</span>
              <b>{c.name}</b>
              <small>{c.use}</small>
              <em>{c.contrast}</em>
            </div>
          ))}
        </div>
        <div className="ev-type">
          <div className="ev-type-sample">
            <p className="eyebrow">TIPOGRAFÍA</p>
            <b style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1 }}>DM Sans</b>
            <span>Familia principal del manual · pesos 400 / 500 / 600 / 700 · respaldo Inter, sans-serif</span>
            <span className="ev-type-scale">H1 36-45 px · H2 18-24 px · Cuerpo 13-14 px · Etiquetas 10-11 px</span>
          </div>
          <div className="ev-logo-rules">
            <p className="eyebrow">LOGO</p>
            <div className="ev-logo-box"><img src={LOGO_UAO} alt="Logo UAO con área de protección" /></div>
            <span>Área de protección = altura de la “o” · mínimo 50 px digital · sobre fondos oscuros va en contenedor blanco · alineación a la izquierda.</span>
          </div>
        </div>
      </div>

      <div className="ev-statement">
        <p className="eyebrow">PRINCIPIOS HCI DESTACADOS</p>
        <h3>Affordance · Consistencia · Prevención de errores</h3>
      </div>
      <div className="ev-highlights">
        {HIGHLIGHTED.map((h) => (
          <article key={h.key} className="ev-highlight" data-testid={`ev-highlight-${h.key}`}>
            <small>{h.source}</small>
            <b>{h.title}</b>
            <p>{h.text}</p>
            <span className="ev-where"><b>Dónde:</b> {h.where}</span>
          </article>
        ))}
      </div>
      <LiveExamples />

      <div className="ev-statement">
        <p className="eyebrow">LAS 10 HEURÍSTICAS DE NIELSEN</p>
        <h3>Dónde se evidencia cada una en la interfaz</h3>
      </div>
      <ol className="ev-heuristics" data-testid="ev-heuristics-list">
        {HEURISTICS.map((h) => (
          <li key={h.n}>
            <span className="ev-num">{h.n}</span>
            <div><b>{h.title}</b><p>{h.apply}</p></div>
          </li>
        ))}
      </ol>
    </div>
  );
}
