import { useState } from "react";
import { ChevronDown } from "lucide-react";

/* Each card owns its hover, keyboard-focus and click-to-keep-open state. */
export default function HoverDisclosureCard({
  className,
  detailsClassName,
  panelClassName,
  panelId,
  label,
  children,
  panel,
  footer,
  ...articleProps
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovered || focused || pinned;

  return (
    <article
      {...articleProps}
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      {children}
      <details className={detailsClassName} open={open}>
        <summary
          aria-controls={panelId}
          onClick={(event) => {
            event.preventDefault();
            setPinned((value) => !value);
          }}
        >
          {label} <ChevronDown size={14} aria-hidden="true" />
        </summary>
        <div id={panelId} className={panelClassName} aria-hidden={!open}>
          {panel}
        </div>
      </details>
      {footer}
    </article>
  );
}
