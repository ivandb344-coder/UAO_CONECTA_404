import axios from "axios";

const ENV_BACKEND = process.env.REACT_APP_BACKEND_URL;
const isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
// El ingreso enruta /api en el mismo dominio; si el usuario navega por un alias distinto al de .env,
// las llamadas cross-origin fallan (el proxy reescribe Origin) → usamos el mismo origen del navegador.
export const BACKEND_URL = !isLocalHost && window.location.origin !== ENV_BACKEND ? window.location.origin : ENV_BACKEND;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });
api.interceptors.request.use((c) => {
  const t = localStorage.getItem("uao_token");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});
api.interceptors.response.use(
  (r) => r,
  (error) => {
    const url = error.config?.url || "";
    if (error.response?.status === 401 && !url.includes("/auth/") && localStorage.getItem("uao_token")) {
      window.dispatchEvent(new CustomEvent("uao:unauthorized"));
    }
    return Promise.reject(error);
  },
);

export const bogotaDate = (iso) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export const bogotaShort = (iso) =>
  new Date(iso).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short" });
