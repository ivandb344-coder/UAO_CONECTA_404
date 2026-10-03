import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck, GraduationCap, XCircle } from "lucide-react";
import { api } from "@/lib/api";

/* Retroalimentación inmediata de la verificación institucional (heurística 1 + prevención de errores). */
export function useInstitutionalCheck(email) {
  const [state, setState] = useState({ status: "idle" });
  const last = useRef("");

  const check = async () => {
    const value = (email || "").trim().toLowerCase();
    if (!value.includes("@") || value === last.current) return;
    last.current = value;
    setState({ status: "loading" });
    try {
      const r = await api.get("/auth/institutional-check", { params: { email: value } });
      setState({ status: r.data.institutional ? "ok" : "rejected", ...r.data });
    } catch {
      setState({ status: "idle" });
    }
  };

  useEffect(() => {
    if (!(email || "").includes("@")) {
      last.current = "";
      setState({ status: "idle" });
    }
  }, [email]);

  return { identity: state, check };
}

export default function InstitutionalBadge({ identity }) {
  if (identity.status === "idle") return null;
  if (identity.status === "loading") {
    return (
      <div className="identity-badge loading" role="status" data-testid="identity-badge-loading">
        <Loader2 size={14} className="spin" aria-hidden="true" /> Verificando identidad institucional…
      </div>
    );
  }
  if (identity.status === "rejected") {
    return (
      <div className="identity-badge rejected" role="alert" data-testid="identity-badge-rejected">
        <XCircle size={14} aria-hidden="true" /> {identity.message}
      </div>
    );
  }
  const professor = identity.role === "professor";
  return (
    <div className={`identity-badge ok ${professor ? "professor" : "student"}`} role="status" data-testid="identity-badge-ok">
      {professor ? <ShieldCheck size={14} aria-hidden="true" /> : <GraduationCap size={14} aria-hidden="true" />}
      <span>
        <b>{professor ? "Docente verificado" : "Estudiante UAO"}</b>
        <small>{identity.verified_by}</small>
      </span>
    </div>
  );
}
