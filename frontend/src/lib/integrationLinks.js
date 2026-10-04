/* Enlaces de la capa de integración: valores por defecto oficiales + override en localStorage.
   Los profesores/monitores pueden editar las URLs; se guardan en 'uao_integration_links'. */

export const LINKS_KEY = "uao_integration_links";

export const DEFAULT_LINKS = {
  gmail: "https://mail.google.com",
  teams: "https://teams.microsoft.com",
  piazza: "https://piazza.com",
  moodle: "https://moodle.uao.edu.co",
  whatsapp: "https://web.whatsapp.com",
  banner: "https://sinu.uao.edu.co",
};

export const CATEGORIES = [
  { id: "comunicacion", label: "Comunicación oficial" },
  { id: "foros", label: "Foros académicos" },
  { id: "soporte", label: "Soporte & contacto directo" },
];

export const TOOLS = [
  { key: "gmail", name: "Gmail / Google Workspace", category: "comunicacion", category_label: "Comunicación oficial", description: "Correo institucional @uao.edu.co y tutorías por Google Meet.", color: "#EA4335" },
  { key: "teams", name: "Microsoft Teams / Outlook", category: "comunicacion", category_label: "Comunicación oficial", description: "Reuniones, mensajes de clase y correo Outlook institucional.", color: "#5B5FC7" },
  { key: "piazza", name: "Piazza", category: "foros", category_label: "Foros académicos", description: "Foros de preguntas y respuestas (Q&A) y colaboración con docentes.", color: "#1E73BE" },
  { key: "moodle", name: "Moodle UAO", category: "foros", category_label: "Foros académicos", description: "Aulas virtuales, foros del curso, entregas y recursos.", color: "#F98012" },
  { key: "whatsapp", name: "WhatsApp UAO", category: "soporte", category_label: "Soporte & contacto directo", description: "Atención inmediata, canal de avisos y grupos de estudio.", color: "#25D366" },
  { key: "banner", name: "Banner / SINU", category: "soporte", category_label: "Soporte & contacto directo", description: "Sistema de información académica: matrícula, notas y promedio.", color: "#1E293B" },
];

export function loadLinks() {
  try {
    const raw = localStorage.getItem(LINKS_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved && typeof saved === "object") return { ...DEFAULT_LINKS, ...saved };
  } catch {
    /* json inválido: usar defaults */
  }
  return { ...DEFAULT_LINKS };
}

export function saveLinks(links) {
  try {
    localStorage.setItem(LINKS_KEY, JSON.stringify(links));
  } catch {
    /* almacenamiento no disponible */
  }
}
