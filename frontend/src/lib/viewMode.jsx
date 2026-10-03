import { createContext, useContext, useMemo, useState } from "react";

/* Rol visual: un estudiante puede activar "Modo Monitor" (solo UI). El rol real lo asigna el backend. */
const KEY = "uao_monitor_mode";

const ViewModeContext = createContext({
  monitorMode: false,
  canToggle: false,
  viewRole: "student",
  setMonitorMode: () => {},
});

export function ViewModeProvider({ user, children }) {
  const canToggle = user?.role === "student";
  const [monitorMode, setState] = useState(() => localStorage.getItem(KEY) === "1");

  const value = useMemo(() => {
    const active = canToggle && monitorMode;
    return {
      monitorMode: active,
      canToggle,
      viewRole: active ? "monitor" : user?.role || "student",
      setMonitorMode: (next) => {
        localStorage.setItem(KEY, next ? "1" : "0");
        setState(next);
      },
    };
  }, [canToggle, monitorMode, user?.role]);

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}

export const useViewMode = () => useContext(ViewModeContext);
