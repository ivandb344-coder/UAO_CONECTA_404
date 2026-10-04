import { useCallback, useEffect, useState } from "react";
import { KeyRound, RefreshCw, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import IntegrationCard from "@/components/hub/IntegrationCard";
import EcosystemLayer from "@/components/hub/EcosystemLayer";

const Skeleton = () => (
  <div className="integration-grid" data-testid="integration-loading" aria-busy="true">
    {[0, 1, 2].map((i) => (
      <div className="integration-card skeleton" key={i}>
        <span className="sk sk-title" /><span className="sk" /><span className="sk" /><span className="sk short" />
      </div>
    ))}
  </div>
);

/* Capa de integración: una sola sesión institucional, tres sistemas, cero fragmentación. */
export default function IntegrationLayer({ user }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api.get("/integrations/summary")
      .then((r) => setData(r.data))
      .catch(() => setError("No pudimos sincronizar con los sistemas UAO. Puedes reintentar."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
    <section className="integration-layer" aria-labelledby="integration-title" data-testid="integration-layer">
      <div className="section-title">
        <div>
          <p className="eyebrow">CAPA DE INTEGRACIÓN</p>
          <h3 id="integration-title">Tus sistemas, en un solo lugar</h3>
        </div>
        <span className="sso-pill" data-testid="sso-pill">
          <KeyRound size={13} aria-hidden="true" /> Sesión institucional · {user.email}
        </span>
      </div>
      {loading && <Skeleton />}
      {!loading && error && (
        <div className="integration-error" role="alert" data-testid="integration-error">
          <AlertTriangle size={16} aria-hidden="true" /> {error}
          <button className="ghost small" onClick={load} data-testid="integration-retry"><RefreshCw size={13} /> Reintentar</button>
        </div>
      )}
      {!loading && data && (
        <div className="integration-grid">
          {data.systems.map((s, i) => <IntegrationCard system={s} index={i} key={s.key} />)}
        </div>
      )}
      {data?.mock && (
        <p className="integration-note" data-testid="integration-mock-note">
          Datos simulados para el prototipo: la conexión real usará el SSO institucional (Moodle Web Services · Microsoft Graph · Banner).
        </p>
      )}
    </section>
    {!loading && <EcosystemLayer />}
    </>
  );
}
