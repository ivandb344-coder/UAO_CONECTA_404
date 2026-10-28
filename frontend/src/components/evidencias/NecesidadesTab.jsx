import { Link } from "react-router-dom";
import { NEEDS } from "@/lib/evidencias";

export default function NecesidadesTab() {
  return (
    <div className="ev-tab" data-testid="ev-tab-necesidades">
      <div className="ev-statement">
        <p className="eyebrow">TRAZABILIDAD</p>
        <h2>De la necesidad al requerimiento verificable, y de ahí a la pantalla</h2>
        <p className="lede">Cada necesidad priorizada se conecta con los requerimientos y con una función vigente de la aplicación. Abre cada vista para revisar su estado actual.</p>
      </div>
      <div className="ev-table-wrap">
        <table className="ev-table" data-testid="ev-needs-table">
          <thead>
            <tr>
              <th scope="col">Necesidad</th>
              <th scope="col">Dato de soporte</th>
              <th scope="col">ID requerimiento</th>
              <th scope="col">Función actual</th>
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
                <td><Link className="ev-need-link" to={n.route} data-testid={`ev-need-open-${n.id}`}>{n.label}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
