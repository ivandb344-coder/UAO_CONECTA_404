import { ShieldCheck, GraduationCap, Sparkles } from "lucide-react";
import { roleLabel, roleSource } from "@/lib/nav";

/* Rol visible en todo momento (heurística 6: reconocer antes que recordar). */
export default function RoleBadge({ user, viewRole, compact = false, testId = "role-badge" }) {
  const role = viewRole || user.role;
  const isMonitorMode = user.role === "student" && role === "monitor";
  const Icon = role === "professor" ? ShieldCheck : isMonitorMode ? Sparkles : GraduationCap;
  const detail = isMonitorMode
    ? "Vista de monitor activa"
    : role === "student" && user.semester
      ? `${user.semester}° semestre · ${user.program || "Ingeniería"}`
      : roleSource(role);

  return (
    <span className={`role-badge role-${role} ${compact ? "compact" : ""}`} data-testid={testId}>
      <Icon size={compact ? 12 : 14} aria-hidden="true" />
      <span>
        <b>{isMonitorMode ? "Modo Monitor" : role === "professor" ? "Docente verificado" : roleLabel(role)}</b>
        {!compact && <small>{detail}</small>}
      </span>
    </span>
  );
}
