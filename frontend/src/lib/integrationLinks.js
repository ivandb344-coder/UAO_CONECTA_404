/* Enlaces de la capa de integración: valores por defecto oficiales + override en localStorage.
   Los profesores/monitores pueden editar las URLs; se guardan en 'uao_integration_links'. */

export const LINKS_KEY = "uao_integration_links";

export const DEFAULT_LINKS = {
  gmail: "https://mail.google.com",
  teams: "https://teams.microsoft.com",
  piazza: "https://piazza.com",
  moodle: "https://campus.uaovirtual.edu.co",
  whatsapp: "https://web.whatsapp.com",
  banner: "https://www.uao.edu.co/ingreso-a-portales/",
  events: "https://www.uao.edu.co/evento/",
  news: "https://www.uao.edu.co/noticias/",
  library: "https://www.uao.edu.co/biblioteca/",
  support: "https://docs.google.com/forms/d/e/1FAIpQLSfiGvm7tFuTxLrOAXClVN09QRfFFWeucOoDbH09JB12bp9SWA/viewform",
};

export function normalizeExternalUrl(rawUrl, fallback = "") {
  const value = String(rawUrl || "").trim();
  if (!value) return fallback;
  if (/^(mailto:|tel:)/i.test(value)) return value;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value.replace(/^\/+/, "")}`;
  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) return fallback;
    const host = parsed.hostname.toLowerCase();
    if (host === "moodle.uao.edu.co") return DEFAULT_LINKS.moodle;
    if (host === "sinu.uao.edu.co" || host === "banner.uao.edu.co") return DEFAULT_LINKS.banner;
    if (host === "meet.google.com") {
      const doubleMeet = parsed.pathname.match(/^\/meet\/([a-z0-9-]+)\/?$/i);
      if (doubleMeet) return `https://meet.google.com/${doubleMeet[1]}`;
      if (parsed.pathname === "/uao-calculo") return "https://meet.google.com/";
    }
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export const CATEGORIES = [
  { id: "soporte", label: "Soporte y ayuda" },
  { id: "comunicacion", label: "Comunicación oficial" },
  { id: "foros", label: "Foros académicos" },
];

export const TOOLS = [
  { key: "gmail", name: "Gmail / Google Workspace", category: "comunicacion", category_label: "Comunicación oficial", description: "Correo institucional @uao.edu.co y tutorías por Google Meet.", color: "#EA4335" },
  { key: "teams", name: "Microsoft Teams / Outlook", category: "comunicacion", category_label: "Comunicación oficial", description: "Reuniones, mensajes de clase y correo Outlook institucional.", color: "#5B5FC7" },
  { key: "piazza", name: "Piazza", category: "foros", category_label: "Foros académicos", description: "Foros de preguntas y respuestas (Q&A) y colaboración con docentes.", color: "#1E73BE" },
  { key: "moodle", name: "Moodle UAO", category: "foros", category_label: "Foros académicos", description: "Aulas virtuales, foros del curso, entregas y recursos.", color: "#F98012" },
  { key: "whatsapp", name: "WhatsApp UAO", category: "soporte", category_label: "Soporte & contacto directo", description: "Atención inmediata, canal de avisos y grupos de estudio.", color: "#25D366" },
  { key: "banner", name: "Banner / SINU", category: "soporte", category_label: "Soporte & contacto directo", description: "Sistema de información académica: matrícula, notas y promedio.", color: "#1E293B" },
  { key: "support", name: "Soporte UAO Conecta", category: "soporte", category_label: "Soporte y ayuda", description: "Solicita ayuda o reporta un problema relacionado con UAO Conecta.", color: "#B10E3D" },
];

export function loadLinks() {
  try {
    const raw = localStorage.getItem(LINKS_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved && typeof saved === "object") {
      const normalized = { ...DEFAULT_LINKS };
      for (const [key, val] of Object.entries(saved)) {
        if (typeof val === "string" && val.trim()) {
          normalized[key] = normalizeExternalUrl(val, DEFAULT_LINKS[key] || "");
        }
      }
      const savedSupport = typeof saved.support === "string" ? saved.support.trim() : "";
      // Upgrade the old empty-recipient mailto link saved in existing browsers.
      normalized.support = !savedSupport || /^mailto:/i.test(savedSupport)
        ? DEFAULT_LINKS.support
        : normalizeExternalUrl(savedSupport, DEFAULT_LINKS.support);
      return normalized;
    }
  } catch {
    /* json inválido: usar defaults */
  }
  return { ...DEFAULT_LINKS };
}

export function saveLinks(links) {
  try {
    localStorage.setItem(LINKS_KEY, JSON.stringify(links));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("uao:links-updated"));
    }
  } catch {
    /* almacenamiento no disponible */
  }
}
