import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/* Modal Lightbox para ampliar capturas de UI. Fondo oscuro translúcido con desenfoque,
   cierre con botón (X), clic fuera del contenido y tecla Escape. */
export default function Lightbox({ open, src, alt, caption, onClose }) {
  const handleKey = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return undefined;
    document.addEventListener("keydown", handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prev;
    };
  }, [open, handleKey]);

  if (!open) return null;

  return createPortal(
    <div
      className="lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Imagen ampliada"}
      data-testid="lightbox"
      onClick={onClose}
    >
      <button
        type="button"
        className="lightbox-close"
        aria-label="Cerrar imagen ampliada"
        data-testid="lightbox-close"
        onClick={onClose}
      >
        <X size={22} aria-hidden="true" />
      </button>
      <figure className="lightbox-figure" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={alt} data-testid="lightbox-image" />
        {caption && <figcaption>{caption}</figcaption>}
      </figure>
    </div>,
    document.body
  );
}
