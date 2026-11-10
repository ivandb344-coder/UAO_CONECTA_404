import { createContext, useContext, useMemo, useState } from "react";
import { api } from "./api";

/* La vista Monitor no cambia el rol institucional. La activación habilita solo funciones de apoyo entre pares. */
const KEY = "uao_monitor_mode";

const ViewModeContext = createContext({
  monitorMode: false,
  canToggle: false,
  peerMonitorEnabled: false,
  viewRole: "student",
  setMonitorMode: () => {},
});

export function ViewModeProvider({ user, children }) {
  const canToggle = user?.role === "student";
  const [monitorMode, setState] = useState(() =>
    localStorage.getItem(KEY) === "1" && (user?.role !== "student" || user?.peer_monitor_enabled)
  );
  const [peerMonitorEnabled, setPeerMonitorEnabled] = useState(Boolean(user?.peer_monitor_enabled));

  const value = useMemo(() => {
    const active = canToggle && monitorMode;
    return {
      monitorMode: active,
      canToggle,
      peerMonitorEnabled,
      viewRole: active ? "monitor" : user?.role || "student",
      setMonitorMode: async (next) => {
        // La autorización de monitor par es consentimiento persistente; salir de la vista solo cambia la interfaz.
        if (canToggle && next && !peerMonitorEnabled) {
          await api.patch("/auth/peer-monitor-mode", { enabled: Boolean(next) });
          setPeerMonitorEnabled(Boolean(next));
        }
        localStorage.setItem(KEY, next ? "1" : "0");
        setState(next);
      },
    };
  }, [canToggle, monitorMode, peerMonitorEnabled, user?.role]);

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}

export const useViewMode = () => useContext(ViewModeContext);
