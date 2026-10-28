import { useRef, useState } from "react";
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
  const pointerDown = useRef(false);
  const lastPointerType = useRef("");
  const open = hovered || focused || pinned;

  return (
    <article
      {...articleProps}
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerEnter={(event) => { if (event.pointerType !== "touch") setHovered(true); }}
      onPointerLeave={(event) => { if (event.pointerType !== "touch") setHovered(false); }}
      onPointerDown={(event) => { pointerDown.current = true; lastPointerType.current = event.pointerType; }}
      onPointerUp={() => window.setTimeout(() => { pointerDown.current = false; }, 0)}
      onPointerCancel={() => { pointerDown.current = false; }}
      onFocus={() => { if (!pointerDown.current) setFocused(true); }}
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
            if (lastPointerType.current === "touch") setPinned((value) => !value);
            else setPinned(false);
            lastPointerType.current = "";
          }}
          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") lastPointerType.current = "keyboard"; }}
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
