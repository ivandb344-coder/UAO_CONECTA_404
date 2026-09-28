import { useAccessibility } from "@/lib/accessibility";

const TEXT_SIZES = [
  { value: "small", label: "A-", title: "Texto pequeño" },
  { value: "normal", label: "A", title: "Texto normal" },
  { value: "large", label: "A+", title: "Texto grande" },
  { value: "xlarge", label: "A++", title: "Texto muy grande" },
];

function Toggle({ id, checked, onChange, label }) {
  return (
    <div className="pref-control">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        className="switch-btn"
        onClick={() => onChange(!checked)}
        data-testid={`a11y-${id}-switch`}
      />
      <span className="switch-label" aria-hidden="true">{checked ? "Activado" : "Desactivado"}</span>
      <span id={`${id}-label`} className="sr-only">{label}</span>
    </div>
  );
}

function PrefRow({ id, title, description, children }) {
  return (
    <div className="pref-row" data-testid={`a11y-row-${id}`}>
      <div className="pref-text">
        <b id={`${id}-title`}>{title}</b>
        <span>{description}</span>
      </div>
      {children}
    </div>
  );
}

export default function AccessibilityPanel() {
  const { prefs, update, saving, saveError } = useAccessibility();
  return (
    <section className="settings-section" aria-labelledby="a11y-heading" data-testid="accessibility-panel">
      <p className="eyebrow">ACCESIBILIDAD</p>
      <h2 id="a11y-heading">Adapta UAO Conecta a tu forma de usarla</h2>
      <p>Estas preferencias se guardan en tu cuenta y se aplican cada vez que inicias sesión, en cualquier dispositivo.</p>

      <PrefRow id="contrast" title="Contraste" description="El alto contraste usa texto negro sobre blanco y bordes marcados para facilitar la lectura.">
        <div className="seg" role="group" aria-label="Contraste">
          <button type="button" aria-pressed={prefs.contrast === "normal"} onClick={() => update({ contrast: "normal" })} data-testid="a11y-contrast-normal">Normal</button>
          <button type="button" aria-pressed={prefs.contrast === "high"} onClick={() => update({ contrast: "high" })} data-testid="a11y-contrast-high">Alto contraste</button>
        </div>
      </PrefRow>

      <PrefRow id="text-size" title="Tamaño del texto" description="Aumenta o disminuye el tamaño de todo el texto y los controles de la interfaz.">
        <div className="seg" role="group" aria-label="Tamaño del texto">
          {TEXT_SIZES.map((s) => (
            <button key={s.value} type="button" title={s.title} aria-label={s.title} aria-pressed={prefs.text_size === s.value} onClick={() => update({ text_size: s.value })} data-testid={`a11y-text-${s.value}`}>
              {s.label}
            </button>
          ))}
        </div>
      </PrefRow>

      <PrefRow id="animations" title="Animaciones" description="Desactívalas si las transiciones te distraen o te generan molestias.">
        <Toggle id="animations" checked={prefs.animations} onChange={(v) => update({ animations: v })} label="Animaciones de la interfaz" />
      </PrefRow>

      <PrefRow id="reduced-motion" title="Movimiento reducido" description="Elimina desplazamientos, efectos al pasar el cursor y movimientos automáticos.">
        <Toggle id="reduced-motion" checked={prefs.reduced_motion} onChange={(v) => update({ reduced_motion: v })} label="Modo de movimiento reducido" />
      </PrefRow>

      <PrefRow id="focus" title="Foco resaltado" description="Muestra un borde ámbar más grueso alrededor del elemento activo al navegar con el teclado (Tab).">
        <Toggle id="focus" checked={prefs.focus_visible} onChange={(v) => update({ focus_visible: v })} label="Mejorar visibilidad del foco" />
      </PrefRow>

      <PrefRow id="large-controls" title="Controles grandes" description="Botones, campos y enlaces de al menos 44 píxeles, más fáciles de tocar y de pulsar.">
        <Toggle id="large-controls" checked={prefs.large_controls} onChange={(v) => update({ large_controls: v })} label="Interfaz con controles grandes" />
      </PrefRow>

      <p className="pref-status" role="status" aria-live="polite" data-testid="a11y-save-status">
        {saving ? "Guardando tus preferencias…" : saveError || "Cambios guardados en tu cuenta."}
      </p>
    </section>
  );
}
