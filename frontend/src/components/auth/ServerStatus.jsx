import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API } from "@/lib/api";

const LABEL = {
  checking: "Conectando con los sistemas UAO…",
  waking: "Despertando el servidor… puede tardar hasta 60 s",
  online: "Sistemas UAO en línea",
  offline: "Servidor no disponible · reintentando",
};

/* Visibilidad del estado del sistema (RNF-12): avisa del arranque en frío del backend en Render. */
export default function ServerStatus() {
  const [status, setStatus] = useState("checking");
  const timer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      const slow = setTimeout(() => !cancelled && setStatus((s) => (s === "checking" ? "waking" : s)), 2500);
      try {
        await axios.get(`${API}/health`, { timeout: 60000 });
        if (!cancelled) setStatus("online");
      } catch {
        if (!cancelled) {
          setStatus("offline");
          timer.current = setTimeout(ping, 8000);
        }
      } finally {
        clearTimeout(slow);
      }
    };
    ping();
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
    };
  }, []);

  return (
    <span className={`server-status ${status}`} role="status" data-testid="server-status">
      <i aria-hidden="true" /> {LABEL[status]}
    </span>
  );
}
