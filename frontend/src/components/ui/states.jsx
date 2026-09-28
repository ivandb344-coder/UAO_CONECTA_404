export const Loading = ({ label = "Cargando tu espacio…" }) => (
  <div className="loading" data-testid="loading-state">
    <span />
    {label}
  </div>
);

export const Empty = ({ text }) => (
  <div className="empty" data-testid="empty-state">
    {text}
  </div>
);
