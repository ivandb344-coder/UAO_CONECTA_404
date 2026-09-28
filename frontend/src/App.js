import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
        <Route path="/chat" element={<Chat />} />
        <Route path="/asistente-ia" element={<AI />} />
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (localStorage.getItem("uao_token")) {
      api
        .get("/auth/me")
        .then((r) => setUser(r.data))
        .catch(() => localStorage.removeItem("uao_token"))
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []);
  const logout = () => {
    localStorage.removeItem("uao_token");
    setUser(null);
  };
  if (!ready) return null;
  if (!user) return <Login onLogin={setUser} />;
  return <AuthenticatedShell user={user} onLogout={logout} />;
}

export default function Root() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
