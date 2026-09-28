import { useEffect, useState } from "react";
import { fetchProtectedFile } from "@/services/fileService";

export function useProtectedFile(storagePath) {
  const [state, setState] = useState({ url: "", loading: !!storagePath, error: "" });

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    if (!storagePath) {
      setState({ url: "", loading: false, error: "" });
      return () => {};
    }
    setState({ url: "", loading: true, error: "" });
    fetchProtectedFile(storagePath)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl, loading: false, error: "" });
      })
      .catch((err) => {
        if (!active) return;
        const status = err?.response?.status;
        const message =
          status === 401
            ? "Tu sesión expiró. Vuelve a iniciar sesión."
            : status === 403
              ? "No tienes permisos para ver este archivo."
              : "No pudimos cargar este archivo.";
        setState({ url: "", loading: false, error: message });
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [storagePath]);

  return state;
}

export function useProtectedFileUrl(storagePath) {
  return useProtectedFile(storagePath).url;
}
