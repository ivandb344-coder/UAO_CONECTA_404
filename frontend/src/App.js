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

const LOGOUT_MESSAGE =
  "Sesión cerrada correctamente. Muchas gracias, esperamos verte pronto.";

const GOOGLE_CANCEL_MESSAGE =
  "Ingreso con Google cancelado. Puedes intentarlo nuevamente cuando quieras.";

const GOOGLE_ERROR_MESSAGE =
  "No pudimos completar el ingreso con Google. Inténtalo nuevamente.";

/* ============================================================
   FUNCIÓN AUXILIAR DE PARSEO DE PARÁMETROS OAUTH / GOOGLE
   ============================================================ */

function getOAuthParams(hash) {
  const searchParams = new URLSearchParams(window.location.search);

  const hashQuery = (hash || "").includes("?")
    ? (hash || "").split("?")[1]
    : (hash || "").replace(/^#\/?/, "");
  const hashParams = new URLSearchParams(hashQuery);

  // Buscar session_id o token/code en la URL
  const sessionId =
    searchParams.get("session_id") ||
    hashParams.get("session_id") ||
    searchParams.get("code") ||
    hashParams.get("code");

  const oauthError =
    searchParams.get("error") || hashParams.get("error");

  const oauthErrorDescription =
    searchParams.get("error_description") ||
    hashParams.get("error_description");

  return { sessionId, oauthError, oauthErrorDescription };
}

/* ============================================================
   RUTAS DE USUARIO AUTENTICADO
   ============================================================ */

function AuthenticatedShell({ user, setUser, onLogout }) {
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
        <Route path="/perfil" element={<Profile me={user} />} />
        <Route
          path="/perfil/editar"
          element={<ProfileEdit me={user} onUpdate={onUpdate} />}
        />
        <Route path="/perfil/:uid" element={<Profile me={user} />} />
        <Route path="/notificaciones" element={<Notifications />} />
        <Route path="/buscar" element={<SearchResults />} />
        {user.role !== "student" && (
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

function GoogleCallback({ hash, onLogin, onError, onNotice }) {
  const nav = useNavigate();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const { sessionId, oauthError, oauthErrorDescription } = getOAuthParams(hash);

    console.log("🔍 GoogleCallback iniciado. Parámetros detectados:", {
      sessionId,
      oauthError,
      oauthErrorDescription,
      fullSearch: window.location.search,
      fullHash: window.location.hash,
    });

    if (!sessionId) {
      console.warn("⚠️ No se encontró session_id ni code en la URL.");
      if (
        oauthError === "access_denied" ||
        oauthError === "cancelled" ||
        oauthError === "canceled"
      ) {
        onNotice(GOOGLE_CANCEL_MESSAGE);
      } else if (oauthError || oauthErrorDescription) {
        onError(
          decodeURIComponent(
            oauthErrorDescription || oauthError || GOOGLE_ERROR_MESSAGE
          )
        );
      } else {
        onError(GOOGLE_ERROR_MESSAGE);
      }
      nav("/", { replace: true });
      return;
    }

    // Limpiar el session_id de la barra de direcciones sin recargar la página
    if (window.location.search) {
      const cleanUrl =
        window.location.origin +
        window.location.pathname +
        window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    console.log("🚀 Enviando session_id al backend mediante POST /auth/google...");

    api
      .post("/auth/google", { session_id: sessionId })
      .then((r) => {
        console.log("✅ Respuesta del backend al autenticar con Google:", r.data);

        if (!r?.data?.token || !r?.data?.user) {
          throw new Error("Respuesta de autenticación incompleta del servidor.");
        }

        localStorage.setItem("uao_token", r.data.token);
        onLogin(r.data.user);

        if (r.data.user.profile_completed) {
          nav("/inicio", { replace: true });
        } else {
          nav("/perfil/completar", { replace: true });
        }
      })
      .catch((x) => {
        console.error("❌ Error en la llamada API POST /auth/google:", x);
        const status = x.response?.status;
        const detail = x.response?.data?.detail;

        let message = GOOGLE_ERROR_MESSAGE;

        if (typeof detail === "string" && detail.trim()) {
          message = detail;
        } else if (x.message) {
          message = `Error de conexión: ${x.message}`;
        }

        if (status === 401) {
          message = "La autenticación con Google no fue autorizada. Inténtalo nuevamente.";
        } else if (status === 404) {
          message = "El servicio de autenticación con Google no existe en el backend (404).";
        }

        onError(message);
        nav("/", { replace: true });
      });
  }, [hash, nav, onError, onLogin, onNotice]);

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

  const { sessionId, oauthError } = getOAuthParams(location.hash);

  const returningFromGoogle = Boolean(sessionId) || Boolean(oauthError);

  /* ==========================================================
     RESTAURAR SESIÓN
     ========================================================== */

  useEffect(() => {
    if (returningFromGoogle) {
      setReady(true);
      return;
    }

    const token = localStorage.getItem("uao_token");

    if (token) {
      api
        .get("/auth/me")
        .then((r) => {
          setUser(r.data);
        })
        .catch(() => {
          localStorage.removeItem("uao_token");
          clearProtectedFileCache();
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

  const logout = () => {
    const confirmed = window.confirm("¿Estás seguro de que deseas cerrar sesión?");
    if (!confirmed) return;

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
    setAuthError("");
    setAuthNotice("");
    setUser(u);
  };

  const onGoogleError = (message) => {
    console.warn("⚠️ Error devuelto por Google/Backend asignado:", message);
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
              hash={location.hash}
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
          <AuthenticatedShell user={user} setUser={setUser} onLogout={logout} />
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