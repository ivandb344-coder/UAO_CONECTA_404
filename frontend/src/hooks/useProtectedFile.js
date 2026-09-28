import { useEffect, useState } from "react";
import { fetchProtectedFile } from "@/services/fileService";

export function useProtectedFileUrl(storagePath) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    if (!storagePath) {
      setUrl("");
      return () => {};
    }
    fetchProtectedFile(storagePath)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setUrl("");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [storagePath]);

  return url;
}
