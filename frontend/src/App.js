import { useEffect, useRef, useState } from "react";
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
import CompleteProfile from "@/pages/CompleteProfile";
import Profile from "@/pages/Profile";
import ProfileEdit from "@/pages/ProfileEdit";
import Notifications from "@/pages/Notifications";
import SearchResults from "@/pages/SearchResults";
import Reviews from "@/pages/Reviews";
import Settings from "@/pages/Settings";
import { ChatUnreadProvider } from "@/lib/chatUnread";
import { NotificationsProvider } from "@/lib/notifications";
import { AccessibilityProvider } from "@/lib/accessibility";
import { clearProtectedFileCache } from "@/services/fileService";
import "@/styles/App.css";
import "@/styles/task.css";
import "@/styles/features.css";
import "@/styles/profile.css";
import "@/styles/review.css";
import "@/styles/accessibility.css";

const LOGOUT_MESSAGE = "Sesión cerrada correctamente. Muchas gracias, esperamos verte pronto.";

function AuthenticatedShell({ user, setUser, onLogout }) {
  const onUpdate = (u) => setUser((prev) => ({ ...prev, ...u }));
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
        <Route path="/perfil" element={<Profile me={user} />} />
        <Route path="/perfil/editar" element={<ProfileEdit me={user} onUpdate={onUpdate} />} />
        <Route path="/perfil/:uid" element={<Profile me={user} />} />
        <Route path="/notificaciones" element={<Notifications />} />
        <Route path="/buscar" element={<SearchResults />} />
        {user.role !== "student" && <Route path="/revisiones" element={<Reviews />} />}
        <Route path="/configuracion" element={<Settings user={user} />} />
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </Layout>
  );
}

function GoogleCallback({ hash, onLogin, onError }) {
  const nav = useNavigate();
  const processed = useRef(false);
  useEffect(() => {
    // Canjea el session_id una sola vez (StrictMode/re-render no deben crear cuentas duplicadas).
    if (processed.current) return;
    processed.current = true;
    const parts = new URLSearchParams(hash.replace(/^#/, ""));
    const sessionId = parts.get("session_id");
    if (!sessionId) return;
    api
      .post("/auth/google", { session_id: sessionId })
      .then((r) => {
        localStorage.setItem("uao_token", r.data.token);
        onLogin(r.data.user);
        nav(r.data.user.profile_completed ? "/inicio" : "/perfil/completar", { replace: true });
      })
      .catch((x) => {
        onError(x.response?.data?.detail || "No pudimos completar el ingreso con Google.");
        nav("/", { replace: true });
      });
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
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");

  const returningFromGoogle = location.hash?.includes("session_id=");

  useEffect(() => {
    if (returningFromGoogle) {
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
    clearProtectedFileCache();
    setUser(null);
    setAuthError("");
    setAuthNotice(LOGOUT_MESSAGE);
    nav("/", { replace: true });
  };

  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem("uao_token");
      clearProtectedFileCache();
      setUser(null);
      setAuthError("Tu sesión expiró. Inicia sesión nuevamente.");
    };
    window.addEventListener("uao:unauthorized", onUnauthorized);
    return () => window.removeEventListener("uao:unauthorized", onUnauthorized);
  }, []);

  const onLogin = (u) => {
    setAuthNotice("");
    setUser(u);
  };

  if (!ready) return null;
  let content;
  if (returningFromGoogle && !user) {
    content = (
      <NotificationsProvider enabled={false}>
        <ChatUnreadProvider enabled={false}>
          <GoogleCallback hash={location.hash} onLogin={onLogin} onError={setAuthError} />
        </ChatUnreadProvider>
      </NotificationsProvider>
    );
  } else if (!user) {
    content = <Login onLogin={onLogin} initialError={authError} initialNotice={authNotice} />;
  } else if (!user.profile_completed) {
    content = (
      <NotificationsProvider enabled={false}>
        <ChatUnreadProvider enabled={false}>
          <CompleteProfile user={user} onDone={(u) => setUser((prev) => ({ ...prev, ...u, profile_completed: true }))} />
        </ChatUnreadProvider>
      </NotificationsProvider>
    );
  } else {
    content = (
      <NotificationsProvider enabled={!!user}>
        <ChatUnreadProvider enabled={!!user}>
          <AuthenticatedShell user={user} setUser={setUser} onLogout={logout} />
        </ChatUnreadProvider>
      </NotificationsProvider>
    );
  }
  return <AccessibilityProvider user={user}>{content}</AccessibilityProvider>;
}

export default function Root() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
