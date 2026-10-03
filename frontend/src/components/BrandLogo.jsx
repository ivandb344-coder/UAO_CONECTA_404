import { LOGO_UAO } from "@/lib/assets";

/* Logo UAO con área de protección (Manual 2026). `plate` lo monta sobre un contenedor blanco para fondos oscuros. */
export default function BrandLogo({ plate = false, caption = "Hub de Integración Estudiantil", size = "md", testId = "brand-logo" }) {
  return (
    <div className={`brand ${plate ? "brand-plate" : ""} brand-${size}`} data-testid={testId}>
      <img src={LOGO_UAO} alt="Logo UAO" className="h-10 w-auto brand-img" />
      {caption && (
        <span className="brand-caption">
          <b>UAO Conecta</b>
          <small>{caption}</small>
        </span>
      )}
    </div>
  );
}
