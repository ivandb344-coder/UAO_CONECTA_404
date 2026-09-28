export function formatApiError(detail, fallback = "Algo salió mal. Intenta nuevamente.") {
  if (detail == null) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const text = detail.map((e) => (e && typeof e.msg === "string" ? e.msg : "")).filter(Boolean).join(" ");
    return text || fallback;
  }
  if (detail.fields && typeof detail.fields === "object") return Object.values(detail.fields).join(" ") || fallback;
  if (typeof detail.msg === "string") return detail.msg;
  return fallback;
}
