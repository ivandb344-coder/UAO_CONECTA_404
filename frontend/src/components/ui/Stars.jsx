import { Star } from "lucide-react";
import { useState } from "react";

export function StarsDisplay({ value = 0, count = 0, compact = false }) {
  const rounded = Math.round(value);
  return (
    <span className={`stars ${compact ? "compact" : ""}`} data-testid="stars-display">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={compact ? 13 : 15} className={n <= rounded ? "filled" : ""} strokeWidth={1.6} />
      ))}
      <b>{Number(value || 0).toFixed(1)}</b>
      <em>{count} {count === 1 ? "valoración" : "valoraciones"}</em>
    </span>
  );
}

export function StarsInput({ value, onChange, disabled = false, testid = "stars-input" }) {
  const [hover, setHover] = useState(0);
  const active = hover || value || 0;
  return (
    <span className={`stars input ${disabled ? "disabled" : ""}`} data-testid={testid}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onMouseEnter={() => !disabled && setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => !disabled && onChange(n)}
          data-testid={`${testid}-${n}`}
        >
          <Star size={19} className={n <= active ? "filled" : ""} strokeWidth={1.6} />
        </button>
      ))}
    </span>
  );
}
