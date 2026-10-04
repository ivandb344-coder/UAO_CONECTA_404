import { useState } from "react";
import { ZoomIn } from "lucide-react";
import Lightbox from "@/components/evidencias/Lightbox";

/* Imagen con affordance de "clic para ampliar": overlay al hover + apertura del Lightbox.
   Es un <button> independiente, de modo que NO interfiere con el enlace "Ver" de la tarjeta. */
export default function ZoomableImage({ src, alt, caption, className = "", buttonTestId, imgTestId }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`zoomable ${className}`.trim()}
        onClick={() => setOpen(true)}
        aria-label={`Ampliar imagen: ${alt}`}
        data-testid={buttonTestId}
      >
        <img src={src} alt={alt} loading="lazy" data-testid={imgTestId} />
        <span className="zoom-hint" aria-hidden="true">
          <ZoomIn size={15} />
          <span>Clic para ampliar</span>
        </span>
      </button>
      <Lightbox open={open} src={src} alt={alt} caption={caption || alt} onClose={() => setOpen(false)} />
    </>
  );
}
