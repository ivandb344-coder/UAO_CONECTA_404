import { Home, BookOpen, MessageCircle, CalendarDays, Bot, CircleHelp } from "lucide-react";

export const NAV = [
  { path: "/inicio", label: "Inicio", icon: Home },
  { path: "/dudas", label: "Dudas", icon: CircleHelp },
  { path: "/asignaturas", label: "Asignaturas", icon: BookOpen },
  { path: "/asesorias", label: "Asesorías", icon: CalendarDays },
  { path: "/chat", label: "Chat", icon: MessageCircle },
  { path: "/asistente-ia", label: "Asistente IA", icon: Bot },
];

export const roleLabel = (r) =>
  r === "student" ? "Estudiante" : r === "monitor" ? "Monitor" : "Profesor";
