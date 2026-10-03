import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { NEEDS } from "@/lib/evidencias";

export default function NecesidadesTab() {
  const nav = useNavigate();
  return (
    <div className="ev-tab" data-testid="ev-tab-necesidades">
      <div className="ev-statement">
        <p className="eyebrow">TRAZABILIDAD</p>
        <h2>De la necesidad al requerimiento verificable, y de ahí a la pantalla</h2>
        <p className="lede">Cada necesidad priorizada en la indagación (52 estudiantes, 4 docentes) se conecta con sus requerimientos y con la captura de la interfaz que la satisface. Detalle completo en <code>docs/04_requerimientos.md</code>.</p>
      </div>
      <div className="ev-table-wrap">
        <table className="ev-table" data-testid="ev-needs-table">
          <thead>
            <tr>
              <th scope="col">Necesidad</th>
              <th scope="col">Dato de soporte</th>
              <th scope="col">ID requerimiento</th>
              <th scope="col">Captura de UI</th>
            </tr>
          </thead>
          <tbody>
            {NEEDS.map((n) => (
              <tr key={n.id} data-testid={`ev-need-${n.id}`}>
                <td><span className="ev-need-id">{n.id}</span><b>{n.need}</b></td>
                <td className="ev-data">{n.data}</td>
                <td>
                  <div className="ev-reqs">{n.reqs.map((r) => <code key={r} className={r.startsWith("RNF") ? "rnf" : ""}>{r}</code>)}</div>
                </td>
                <td>
                  <figure className="ev-thumb">
                    <img src={n.img} alt={`Captura: ${n.label}`} loading="lazy" />
                    <figcaption>
                      {n.label}
                      {n.route && <button className="link" onClick={() => nav(n.route)} data-testid={`ev-need-open-${n.id}`}>Ver <ExternalLink size={11} aria-hidden="true" /></button>}
                    </figcaption>
                  </figure>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
