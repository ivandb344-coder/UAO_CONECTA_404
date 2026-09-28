import { api } from "@/lib/api";

export function storagePathFromFileUrl(value) {
  const marker = "/api/files/";
  const index = (value || "").indexOf(marker);
  return index >= 0 ? value.slice(index + marker.length) : "";
}

export async function fetchProtectedFile(storagePath) {
  const response = await api.get(`/files/${storagePath}`, { responseType: "blob" });
  return response.data;
}


export async function openProtectedFile(storagePath, { download = false, filename = "archivo" } = {}) {
  const blob = await fetchProtectedFile(storagePath);
  const objectUrl = URL.createObjectURL(blob);
  if (download) {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } else {
    window.open(objectUrl, "_blank", "noopener,noreferrer");
  }
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
