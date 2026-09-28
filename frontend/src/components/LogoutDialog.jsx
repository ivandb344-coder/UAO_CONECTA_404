import { useEffect, useRef } from "react";
import { LogOut, X } from "lucide-react";

export default function LogoutDialog({ open, onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        aria-describedby="logout-desc"
        onClick={(e) => e.stopPropagation()}
        data-testid="logout-dialog"
      >
        <button className="close" onClick={onCancel} aria-label="Cerrar sin cerrar sesión" data-testid="logout-dialog-close">
          <X aria-hidden="true" />
        </button>
        <p className="eyebrow">CERRAR SESIÓN</p>
        <h2 id="logout-title">¿Estás seguro de que deseas cerrar sesión?</h2>
        <p id="logout-desc">Tendrás que iniciar sesión de nuevo para volver a tu espacio en UAO Conecta.</p>
        <div className="confirm-actions">
          <button ref={cancelRef} type="button" className="ghost" onClick={onCancel} data-testid="logout-cancel-button">
            No, permanecer
          </button>
          <button type="button" className="primary" onClick={onConfirm} data-testid="logout-confirm-button">
            <LogOut size={15} aria-hidden="true" /> Sí, cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
