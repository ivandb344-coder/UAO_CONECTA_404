import { Home, BookOpen, MessageCircle, CalendarDays, Bot, CircleHelp, ClipboardCheck, Compass, Trophy, Newspaper } from "lucide-react";
import accessibilitySymbol from "@/assets/accessibility-symbol.png";

export function AccessibilityMark({ size = 18 }) {
  return <img src={accessibilitySymbol} width={size} height={size} className="accessibility-symbol" alt="" aria-hidden="true" />;
}

export const NAV = [
  { path: "/inicio", label: "Inicio", icon: Home },
  { path: "/dudas", label: "Dudas", icon: CircleHelp },
  { path: "/asignaturas", label: "Asignaturas", icon: BookOpen },
  { path: "/asesorias", label: "Asesorías", icon: CalendarDays },
  { path: "/chat", label: "Chat", icon: MessageCircle },
  { path: "/revisiones", label: "Revisiones", mobileLabel: "Revisión", icon: ClipboardCheck, roles: ["professor", "monitor"] },
  { path: "/asistente-ia", label: "Asistente IA", mobileLabel: "IA", icon: Bot },
  { path: "/ranking", label: "Reconocimientos", mobileLabel: "Ranking", icon: Trophy },
  { path: "/vida-uao", label: "Vida UAO", mobileLabel: "Vida UAO", icon: Newspaper },
  { path: "/evidencias-dcu", label: "Tutorial de navegación", mobileLabel: "Guía", icon: Compass, testId: "nav-evidencias-dcu" },
  { path: "/configuracion", label: "Configuración", mobileLabel: "Ajustes", icon: AccessibilityMark },
];

export const navForRole = (role) => NAV.filter((n) => !n.roles || n.roles.includes(role));

export const roleLabel = (r) =>
  r === "student" ? "Estudiante" : r === "monitor" ? "Monitor" : "Docente";

export const roleSource = (r) =>
  r === "professor" ? "Directorio docente · Facultad de Ingeniería" : r === "monitor" ? "Monitoría académica" : "Banner · Registro académico";
