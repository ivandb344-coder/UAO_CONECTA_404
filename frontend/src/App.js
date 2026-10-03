import { useEffect, useRef, useState } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { api } from "@/lib/api";

import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

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
import EvidenciasDCU from "@/pages/EvidenciasDCU";

import { ChatUnreadProvider } from "@/lib/chatUnread";
import { NotificationsProvider } from "@/lib/notifications";
import { AccessibilityProvider } from "@/lib/accessibility";
import { ViewModeProvider, useViewMode } from "@/lib/viewMode";

import { clearProtectedFileCache } from "@/services/fileService";

import "@/styles/App.css";
import "@/styles/task.css";
import "@/styles/features.css";
import "@/styles/profile.css";
import "@/styles/review.css";
import "@/styles/accessibility.css";
import "@/styles/hub.css";

const LOGOUT_MESSAGE =
  "Sesión cerrada correctamente. Muchas gracias, esperamos verte pronto.";

const GOOGLE_CANCEL_MESSAGE =
  "Ingreso con Google cancelado. Puedes intentarlo nuevamente cuando quieras.";

const GOOGLE_ERROR_MESSAGE =
  "No pudimos completar el ingreso con Google. Inténtalo nuevamente.";

/* ============================================================
   FUNCIÓN AUXILIAR DE PARSEO DE PARÁMETROS OAUTH / GOOGLE
   Emergent Auth vuelve a `<redirect>#session_id=...`. Con HashRouter ese
   fragmento se interpreta como la RUTA "/session_id=...", no como location.hash,
   por eso se revisan pathname, search y hash de useLocation() (reactivos) y
   también window.location.search.
   ============================================================ */

function findUrlParam(sources, name) {
  const re = new RegExp(`(?:^|[#/?&])${name}=([^&#/?]*)`);
  for (const source of sources) {
    const match = (source || "").match(re);
    if (match && match[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  return null;
}

function getOAuthParams(location) {
  const sources = [
    window.location.search,
    location?.search,
    location?.hash,
    location?.pathname,
  ];

  return {
    sessionId: findUrlParam(sources, "session_id"),
    oauthError: findUrlParam(sources, "error"),
    oauthErrorDescription: findUrlParam(sources, "error_description"),
  };
}

/* ============================================================
   RUTAS DE USUARIO AUTENTICADO
   ============================================================ */

function AuthenticatedShell({ user, setUser, onLogout }) {
  const { viewRole } = useViewMode();
  const onUpdate = (u) => {
    setUser((prev) => ({
      ...prev,
      ...u,
    }));
  };

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
        <Route path="/evidencias-dcu" element={<EvidenciasDCU user={user} />} />
        <Route path="/perfil" element={<Profile me={user} />} />
        <Route
          path="/perfil/editar"
          element={<ProfileEdit me={user} onUpdate={onUpdate} />}
        />
        <Route path="/perfil/:uid" element={<Profile me={user} />} />
        <Route path="/notificaciones" element={<Notifications />} />
        <Route path="/buscar" element={<SearchResults />} />
        {viewRole !== "student" && (
          <Route path="/revisiones" element={<Reviews />} />
        )}
        <Route path="/configuracion" element={<Settings user={user} />} />
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </Layout>
  );
}

/* ============================================================
   CALLBACK DE GOOGLE
   ============================================================ */

function GoogleCallback({ onLogin, onError, onNotice }) {
  const nav = useNavigate();
  const location = useLocation();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const { sessionId, oauthError, oauthErrorDescription } = getOAuthParams(location);

    if (!sessionId) {
      if (
        oauthError === "access_denied" ||
        oauthError === "cancelled" ||
        oauthError === "canceled"
      ) {
        onNotice(GOOGLE_CANCEL_MESSAGE);
      } else {
        onError(oauthErrorDescription || oauthError || GOOGLE_ERROR_MESSAGE);
      }
      nav("/", { replace: true });
      return;
    }

    // Limpia ?session_id=... de la barra de direcciones (el fragmento se reemplaza al navegar)
    if (window.location.search) {
      window.history.replaceState(
        {},
        document.title,
        window.location.origin + window.location.pathname + window.location.hash
      );
    }

    api
      .post("/auth/google", { session_id: sessionId })
      .then((r) => {
        if (!r?.data?.token || !r?.data?.user) {
          throw new Error("Respuesta de autenticación incompleta del servidor.");
        }

        localStorage.setItem("uao_token", r.data.token);
        onLogin(r.data.user);

        nav(r.data.user.profile_completed ? "/inicio" : "/perfil/completar", {
          replace: true,
        });
      })
      .catch((x) => {
        const status = x.response?.status;
        const detail = x.response?.data?.detail;

        let message = GOOGLE_ERROR_MESSAGE;
        if (status === 401) {
          message = "La autenticación con Google no fue autorizada o expiró. Inténtalo nuevamente.";
        } else if (typeof detail === "string" && detail.trim()) {
          message = detail;
        } else if (!x.response) {
          message = "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";
        }

        onError(message);
        nav("/", { replace: true });
      });
    // Solo debe ejecutarse una vez al volver de Google
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="auth-callback">
      <div className="callback-card">
        <div className="ai-orbit big">
          <span className="dot" />
        </div>
        <p className="eyebrow">CONECTANDO CON GOOGLE</p>
        <h2>Casi listo…</h2>
        <p className="muted">Estamos preparando tu espacio en UAO Conecta.</p>
      </div>
    </main>
  );
}

/* ============================================================
   RUTAS PÚBLICAS DE AUTENTICACIÓN
   ============================================================ */

function PublicAuthRoutes() {
  return (
    <Routes>
      <Route path="/recuperar-contrasena" element={<ForgotPassword />} />
      <Route path="/restablecer-contrasena" element={<ResetPassword />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/* ============================================================
   APLICACIÓN PRINCIPAL
   ============================================================ */

function AppInner() {
  const location = useLocation();
  const nav = useNavigate();

  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");

  const { sessionId, oauthError } = getOAuthParams(location);

  const returningFromGoogle = Boolean(sessionId) || Boolean(oauthError);

  /* ==========================================================
     RESTAURAR SESIÓN
     ========================================================== */

  const sessionChecked = useRef(false);

  useEffect(() => {
    if (returningFromGoogle) {
      setReady(true);
      return;
    }
    if (sessionChecked.current) return;
    sessionChecked.current = true;

    const token = localStorage.getItem("uao_token");

    if (token) {
      api
        .get("/auth/me")
        .then((r) => {
          setUser(r.data);
        })
        .catch((x) => {
          const status = x.response?.status;
          if (status === 401 || status === 403) {
            localStorage.removeItem("uao_token");
            clearProtectedFileCache();
          } else {
            setAuthError("No pudimos conectar con el servidor. Recarga la página en unos segundos.");
          }
          setUser(null);
        })
        .finally(() => {
          setReady(true);
        });
    } else {
      setReady(true);
    }
  }, [returningFromGoogle]);

  /* ==========================================================
     CERRAR SESIÓN
     ========================================================== */

  // La confirmación la gestiona LogoutDialog (Layout.jsx) antes de llamar a onLogout.
  const logout = () => {
    localStorage.removeItem("uao_token");
    clearProtectedFileCache();
    setUser(null);
    setAuthError("");
    setAuthNotice(LOGOUT_MESSAGE);

    nav("/", { replace: true });
  };

  /* ==========================================================
     SESIÓN NO AUTORIZADA
     ========================================================== */

  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem("uao_token");
      clearProtectedFileCache();
      setUser(null);
      setAuthError("Tu sesión expiró. Inicia sesión nuevamente.");
      nav("/", { replace: true });
    };

    window.addEventListener("uao:unauthorized", onUnauthorized);
    return () => {
      window.removeEventListener("uao:unauthorized", onUnauthorized);
    };
  }, [nav]);

  const onLogin = (u) => {
    sessionChecked.current = true;
    setAuthError("");
    setAuthNotice("");
    setUser(u);
  };

  const onGoogleError = (message) => {
    setAuthError(message);
    setAuthNotice("");
  };

  const onGoogleNotice = (message) => {
    setAuthNotice(message);
    setAuthError("");
  };

  if (!ready) {
    return null;
  }

  /* ==========================================================
     GOOGLE CALLBACK
     ========================================================== */

  if (returningFromGoogle && !user) {
    return (
      <AccessibilityProvider user={user}>
        <NotificationsProvider enabled={false}>
          <ChatUnreadProvider enabled={false}>
            <GoogleCallback
              onLogin={onLogin}
              onError={onGoogleError}
              onNotice={onGoogleNotice}
            />
          </ChatUnreadProvider>
        </NotificationsProvider>
      </AccessibilityProvider>
    );
  }

  /* ==========================================================
     USUARIO NO AUTENTICADO
     ========================================================== */

  if (!user) {
    const isPasswordRecoveryRoute =
      location.pathname === "/recuperar-contrasena" ||
      location.pathname === "/restablecer-contrasena";

    if (isPasswordRecoveryRoute) {
      return (
        <AccessibilityProvider user={user}>
          <PublicAuthRoutes />
        </AccessibilityProvider>
      );
    }

    return (
      <AccessibilityProvider user={user}>
        <Login
          onLogin={onLogin}
          initialError={authError}
          initialNotice={authNotice}
        />
      </AccessibilityProvider>
    );
  }

  /* ==========================================================
     PERFIL INCOMPLETO
     ========================================================== */

  if (!user.profile_completed) {
    return (
      <AccessibilityProvider user={user}>
        <NotificationsProvider enabled={false}>
          <ChatUnreadProvider enabled={false}>
            <CompleteProfile
              user={user}
              onDone={(u) =>
                setUser((prev) => ({
                  ...prev,
                  ...u,
                  profile_completed: true,
                }))
              }
            />
          </ChatUnreadProvider>
        </NotificationsProvider>
      </AccessibilityProvider>
    );
  }

  /* ==========================================================
     APLICACIÓN AUTENTICADA
     ========================================================== */

  return (
    <AccessibilityProvider user={user}>
      <NotificationsProvider enabled={!!user}>
        <ChatUnreadProvider enabled={!!user}>
          <ViewModeProvider user={user}>
            <AuthenticatedShell user={user} setUser={setUser} onLogout={logout} />
          </ViewModeProvider>
        </ChatUnreadProvider>
      </NotificationsProvider>
    </AccessibilityProvider>
  );
}

/* ============================================================
   ROOT
   ============================================================ */

export default function Root() {
  return (
    <HashRouter>
      <AppInner />
    </HashRouter>
  );
}