import { api } from "@/lib/api";

const blobCache = new Map();
let cacheToken = null;

export function storagePathFromFileUrl(value) {
  const marker = "/api/files/";
  const index = (value || "").indexOf(marker);
  return index >= 0 ? value.slice(index + marker.length) : "";
}

export function clearProtectedFileCache() {
  blobCache.clear();
  cacheToken = null;
}

export function fetchProtectedFile(storagePath) {
  const token = localStorage.getItem("uao_token") || "";
  if (token !== cacheToken) {
    blobCache.clear();
    cacheToken = token;
  }
  if (!blobCache.has(storagePath)) {
    const request = api
      .get(`/files/${storagePath}`, { responseType: "blob" })
      .then((response) => response.data)
      .catch((error) => {
        blobCache.delete(storagePath);
        throw error;
      });
    blobCache.set(storagePath, request);
  }
  return blobCache.get(storagePath);
}

export function previewKind(file) {
  const type = (file?.content_type || "").toLowerCase();
  const name = (file?.name || file?.storage_path || "").toLowerCase();
  if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) return "image";
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (type.startsWith("video/") || /\.(mp4|webm|ogg|mov)$/.test(name)) return "video";
  return "none";
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
