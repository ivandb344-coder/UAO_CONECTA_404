import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import Login from "@/pages/Login";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Questions from "@/pages/Questions";
import QuestionDetail from "@/pages/QuestionDetail";
import Subjects from "@/pages/Subjects";
import SubjectDetail from "@/pages/SubjectDetail";
import Advisories from "@/pages/Advisories";
import Chat from "@/pages/Chat";
import AI from "@/pages/AI";
import { ChatUnreadProvider } from "@/lib/chatUnread";
import "@/App.css";
import "@/task.css";
import "@/features.css";

function AuthenticatedShell({ user, onLogout }) {
  return (
    <Layout user={user} onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/inicio" replace />} />
        <Route path="/inicio" element={<Dashboard user={user} />} />
        <Route path="/dudas" element={<Questions />} />
        <Route path="/dudas/:id" element={<QuestionDetail />} />
        <Route path="/asignaturas" element={<Subjects />} />
        <Route path="/asignaturas/:id" element={<SubjectDetail user={user} />} />
        <Route path="/asesorias" element={<Advisories user={user} />} />
        <Route path="/chat" element={<Chat user={user} />} />
        <Route path="/chat/:room" element={<Chat user={user} />} />
        <Route path="/asistente-ia" element={<AI />} />
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </Layout>
  );
}

// Reads the Emergent Auth session_id from the URL fragment, exchanges it
// against our backend, stores the JWT and hands the user back to the shell.
function GoogleCallback({ hash, onLogin, onError }) {
  const nav = useNavigate();
  useEffect(() => {
    const parts = new URLSearchParams(hash.replace(/^#/, ""));
    const sessionId = parts.get("session_id");
    if (!sessionId) return;
    let cancelled = false;
    api
      .post("/auth/google", { session_id: sessionId })
      .then((r) => {
        if (cancelled) return;
        localStorage.setItem("uao_token", r.data.token);
        onLogin(r.data.user);
        nav("/inicio", { replace: true });
      })
      .catch((x) => {
        if (cancelled) return;
        onError(x.response?.data?.detail || "No pudimos completar el ingreso con Google.");
        nav("/", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [hash, nav, onError, onLogin]);
  return (
    <main className="auth-callback">
      <div className="callback-card">
        <div className="ai-orbit big"><span className="dot" /></div>
        <p className="eyebrow">CONECTANDO CON GOOGLE</p>
        <h2>Casi listo…</h2>
        <p className="muted">Estamos preparando tu espacio en UAO Conecta.</p>
      </div>
    </main>
  );
}

function AppInner() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState("");

  const returningFromGoogle = location.hash?.includes("session_id=");

  useEffect(() => {
    if (returningFromGoogle) {
      // GoogleCallback will handle it; do not call /auth/me yet.
      setReady(true);
      return;
    }
    const t = localStorage.getItem("uao_token");
    if (t) {
      api
        .get("/auth/me")
        .then((r) => setUser(r.data))
        .catch(() => localStorage.removeItem("uao_token"))
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [returningFromGoogle]);

  const logout = () => {
    localStorage.removeItem("uao_token");
    setUser(null);
  };

  if (!ready) return null;
  if (returningFromGoogle && !user) {
    return (
      <ChatUnreadProvider enabled={false}>
        <GoogleCallback hash={location.hash} onLogin={setUser} onError={setAuthError} />
      </ChatUnreadProvider>
    );
  }
  if (!user) return <Login onLogin={setUser} initialError={authError} />;
  return (
    <ChatUnreadProvider enabled={!!user}>
      <AuthenticatedShell user={user} onLogout={logout} />
    </ChatUnreadProvider>
  );
}

export default function Root() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
