import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ZoomableImage from "@/components/evidencias/ZoomableImage";

/* Carrusel del flujo principal (teclado ← → , puntos y botones con affordance). */
export default function FlowCarousel({ slides }) {
  const [index, setIndex] = useState(0);
  const nav = useNavigate();
  const total = slides.length;

  const go = useCallback((delta) => setIndex((i) => (i + delta + total) % total), [total]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const slide = slides[index];
  return (
    <figure className="flow-carousel" data-testid="flow-carousel" aria-roledescription="carrusel" aria-label="Flujo principal del prototipo">
      <div className="flow-stage">
        <button className="flow-arrow" onClick={() => go(-1)} aria-label="Anterior" data-testid="flow-prev"><ChevronLeft size={20} /></button>
        <div className="flow-frame">
          <ZoomableImage
            src={slide.img}
            alt={`${slide.title}: ${slide.caption}`}
            caption={slide.title}
            imgTestId={`flow-image-${slide.id}`}
            buttonTestId={`flow-zoom-${slide.id}`}
          />
        </div>
        <button className="flow-arrow" onClick={() => go(1)} aria-label="Siguiente" data-testid="flow-next"><ChevronRight size={20} /></button>
      </div>
      <figcaption className="flow-caption">
        <span className="flow-step">Paso {index + 1} de {total}</span>
        <b data-testid="flow-title">{slide.title}</b>
        <p>{slide.caption}</p>
        {slide.route && (
          <button className="link" onClick={() => nav(slide.route)} data-testid={`flow-open-${slide.id}`}>
            Abrir esta pantalla <ExternalLink size={12} aria-hidden="true" />
          </button>
        )}
      </figcaption>
      <div className="flow-dots" role="tablist" aria-label="Pasos del flujo">
        {slides.map((s, i) => (
          <button key={s.id} role="tab" aria-selected={i === index} aria-label={s.title} className={i === index ? "active" : ""} onClick={() => setIndex(i)} data-testid={`flow-dot-${s.id}`} />
        ))}
      </div>
    </figure>
  );
}
