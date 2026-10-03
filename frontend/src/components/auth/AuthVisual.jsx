import BrandLogo from "@/components/BrandLogo";
import ServerStatus from "@/components/auth/ServerStatus";

const SYSTEMS = [
  { key: "moodle", name: "Moodle", what: "Calificaciones y entregas" },
  { key: "teams", name: "Teams", what: "Mensajes y reuniones" },
  { key: "banner", name: "Banner", what: "Promedio y matrícula" },
];

/* Panel institucional del login: propuesta de valor anti-fragmentación. */
export default function AuthVisual() {
  return (
    <section className="auth-visual" aria-label="Presentación del Hub">
      <BrandLogo plate caption="Universidad Autónoma de Occidente" testId="auth-visual-logo" />
      <div className="auth-visual-body">
        <p className="eyebrow light">UNA SOLA CUENTA · CERO FRAGMENTACIÓN</p>
        <h1>
          Hub de Integración
          <br />
          <em>Estudiantil UAO</em>
        </h1>
        <p className="auth-copy">
          No es otra plataforma. Es la capa que une Moodle, Teams y Banner con el apoyo académico entre
          pares: pregunta sin pena, coordina tu grupo y sabe a quién acudir.
        </p>
        <ul className="auth-systems" aria-label="Sistemas integrados">
          {SYSTEMS.map((s) => (
            <li key={s.key} className={`sys-${s.key}`} data-testid={`auth-system-${s.key}`}>
              <span className="sys-mark" aria-hidden="true">{s.name[0]}</span>
              <span><b>{s.name}</b><small>{s.what}</small></span>
            </li>
          ))}
          <li className="sys-hub" aria-hidden="true"><span>→</span><b>Un solo Inicio</b></li>
        </ul>
      </div>
      <div className="auth-visual-foot">
        <blockquote className="quote">“Siempre hay alguien que sabe cómo ayudarte. Ahora sabes dónde encontrarlo.”</blockquote>
        <ServerStatus />
      </div>
      <span className="arc" aria-hidden="true" />
    </section>
  );
}
