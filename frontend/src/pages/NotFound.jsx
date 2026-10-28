import { ArrowLeft, BookOpen, Home, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <section className="page not-found-page" data-testid="not-found-page">
      <p className="eyebrow">UAO CONECTA · NAVEGACIÓN</p>
      <div className="not-found-code" aria-hidden="true">404</div>
      <h1>No encontramos esta página</h1>
      <p className="lede">El enlace puede haber cambiado o la dirección no existe. Puedes volver a una sección disponible.</p>
      <div className="not-found-actions">
        <button className="primary" onClick={() => navigate("/inicio")} data-testid="not-found-home">
          <Home size={16} aria-hidden="true" /> Ir al inicio
        </button>
        <button className="ghost" onClick={() => navigate("/asignaturas")} data-testid="not-found-subjects">
          <BookOpen size={16} aria-hidden="true" /> Ver asignaturas
        </button>
        <button className="ghost" onClick={() => navigate(-1)} data-testid="not-found-back">
          <ArrowLeft size={16} aria-hidden="true" /> Volver
        </button>
      </div>
      <div className="not-found-search-hint"><Search size={15} aria-hidden="true" /> También puedes usar el buscador de la parte superior para encontrar personas, dudas o recursos.</div>
    </section>
  );
}
