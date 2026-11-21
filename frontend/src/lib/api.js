import axios from "axios";
import { cleanTestSubjectStorage, filterCoherentSubjects, isCoherentAdvisory, isCoherentQuestion } from "@/lib/validSubjects";
import { normalizeExternalUrl } from "@/lib/integrationLinks";

cleanTestSubjectStorage();

/* ============================================================
   URL DEL BACKEND
   - GitHub Pages (producción) u otro hosting estático → Render.
     Un hosting estático NO sirve /api, así que nunca se usa su propio origen.
   - Preview/despliegue de Emergent → mismo origen (el ingress enruta /api al backend).
   - localhost → REACT_APP_BACKEND_URL (o Render si no está definida).
   ============================================================ */

export const PRODUCTION_BACKEND_URL = "https://uao-conecta-404.onrender.com";

const cleanBase = (url) => (url || "").trim().replace(/\/+$/, "").replace(/\/api$/, "");
const hostOf = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};
const isLocalHost = (host) => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host);
const isEmergentHost = (host) => /(^|\.)(emergentagent\.com|emergent\.host|emergentcf\.cloud)$/.test(host);

export function resolveBackendUrl(location = window.location, envUrl = process.env.REACT_APP_BACKEND_URL) {
  const env = cleanBase(envUrl);
  const { hostname, origin } = location;

  if (isEmergentHost(hostname)) return origin;
  if (isLocalHost(hostname)) return env || PRODUCTION_BACKEND_URL;

  const envHost = hostOf(env);
  if (env && envHost && !isLocalHost(envHost) && !isEmergentHost(envHost)) return env;
  return PRODUCTION_BACKEND_URL;
}

export const BACKEND_URL = resolveBackendUrl();
export const API = `${BACKEND_URL}/api`;

/* ============================================================
   CLIENTE AXIOS
   ============================================================ */

export const TOKEN_KEY = "uao_token";

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function sanitizeApiPayload(response) {
  const method = (response?.config?.method || "get").toLowerCase();
  if (method !== "get" || !response?.data) return response;

  const rawUrl = String(response.config?.url || "");
  const path = rawUrl
    .split("?")[0]
    .replace(/^https?:\/\/[^/]+/, "")
    .replace(/^\/?api\//, "")
    .replace(/^\/+/, "");

  if (path === "subjects" && Array.isArray(response.data)) {
    response.data = filterCoherentSubjects(response.data);
  } else if (path === "dashboard" && typeof response.data === "object") {
    const subjects = filterCoherentSubjects(response.data.subjects);
    const questions = Array.isArray(response.data.questions)
      ? response.data.questions.filter(isCoherentQuestion)
      : [];
    response.data = {
      ...response.data,
      subjects,
      questions,
      stats: response.data.stats ? { ...response.data.stats, subjects: subjects.length } : response.data.stats,
    };
  } else if (path === "search" && typeof response.data === "object") {
    response.data = {
      ...response.data,
      subjects: filterCoherentSubjects(response.data.subjects),
      questions: Array.isArray(response.data.questions)
        ? response.data.questions.filter(isCoherentQuestion)
        : [],
    };
  } else if (path === "questions" && Array.isArray(response.data)) {
    response.data = response.data.filter(isCoherentQuestion);
  } else if (path === "advisories" && Array.isArray(response.data)) {
    response.data = response.data
      .filter(isCoherentAdvisory)
      .map((a) => (a.link ? { ...a, link: normalizeExternalUrl(a.link, a.link) } : a));
  } else if (path === "integrations/summary" && typeof response.data === "object") {
    const systems = Array.isArray(response.data.systems)
      ? response.data.systems.map((sys) => ({
          ...sys,
          url: normalizeExternalUrl(sys.url, sys.url),
          cta: sys.cta ? { ...sys.cta, url: normalizeExternalUrl(sys.cta.url, sys.cta.url) } : sys.cta,
        }))
      : response.data.systems;
    response.data = { ...response.data, systems };
  } else if (path.startsWith("integrations/") && typeof response.data === "object" && response.data.cta) {
    response.data = {
      ...response.data,
      url: normalizeExternalUrl(response.data.url, response.data.url),
      cta: { ...response.data.cta, url: normalizeExternalUrl(response.data.cta.url, response.data.cta.url) },
    };
  }
  return response;
}

api.interceptors.response.use(
  (response) => sanitizeApiPayload(response),
  (error) => {
    const url = error.config?.url || "";
    if (error.response?.status === 401 && !url.includes("/auth/") && localStorage.getItem(TOKEN_KEY)) {
      window.dispatchEvent(new CustomEvent("uao:unauthorized"));
    }
    return Promise.reject(error);
  },
);

export const bogotaDate = (iso) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export const bogotaShort = (iso) =>
  new Date(iso).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short" });
