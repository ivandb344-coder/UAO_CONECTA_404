import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings2, Search, Bell, LogOut, CheckCheck } from "lucide-react";
import { navForRole } from "@/lib/nav";
import { useChatUnread } from "@/lib/chatUnread";
import { useNotifications } from "@/lib/notifications";
import { useViewMode } from "@/lib/viewMode";
import Avatar from "@/components/Avatar";
import BrandLogo from "@/components/BrandLogo";
import LogoutDialog from "@/components/LogoutDialog";
import RoleBadge from "@/components/hub/RoleBadge";
import MonitorToggle from "@/components/hub/MonitorToggle";

export default function Layout({ user, onLogout, children }) {
  const loc = useLocation();
  const navg = useNavigate();
  const { viewRole } = useViewMode();
  const NAV = navForRole(viewRole);
  const [search, setSearch] = useState("");
  const unread = useChatUnread();
  const notif = useNotifications();
  const totalUnread = unread.total || 0;
  const [notifOpen, setNotifOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [notifOpen]);

  const runSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    navg(`/buscar?q=${encodeURIComponent(q)}`);
  };

  const bellCount = notif.unread || 0;
  const mobileNav = NAV.filter((n) => ["/inicio", "/dudas", "/asignaturas", "/asesorias", "/chat"].includes(n.path));

  return (
    <div className="shell">
      <a href="#contenido" className="skip-link" data-testid="skip-link">Saltar al contenido principal</a>
      <aside aria-label="Navegación principal">
        <BrandLogo size="sm" testId="sidebar-logo" />
        <div className="sidebar-user" onClick={() => navg("/perfil")} role="button" tabIndex={0} aria-label="Ir a mi perfil" onKeyDown={(e) => e.key === "Enter" && navg("/perfil")}>
          <Avatar user={user} size="tiny" testId="sidebar-avatar" />
          <div>
            <strong data-testid="sidebar-user-name">{user.name}</strong>
            <RoleBadge user={user} viewRole={viewRole} compact testId="sidebar-role-badge" />
          </div>
        </div>
        <MonitorToggle />
        <nav aria-label="Secciones">
          {NAV.map((n) => {
            const active = loc.pathname.startsWith(n.path);
            const chatDot = n.path === "/chat" && totalUnread > 0;
            return (
              <button key={n.path} className={active ? "active" : ""} aria-current={active ? "page" : undefined} data-testid={`nav-${n.label.toLowerCase().replaceAll(" ", "-")}`} onClick={() => navg(n.path)}>
                <n.icon size={18} aria-hidden="true" />
                {n.label}
                {chatDot && <em className="nav-badge" data-testid="nav-chat-badge">{totalUnread}</em>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => navg("/perfil")} data-testid="nav-profile">
            <Avatar user={user} size="tiny" testId="sidebar-bottom-avatar" /> Mi perfil
          </button>
          <button onClick={() => setConfirmLogout(true)} data-testid="logout-button">
            <LogOut size={17} aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="content" id="contenido" tabIndex={-1}>
        <header>
          <div className="header-brand" onClick={() => navg("/inicio")} role="button" tabIndex={0} aria-label="Ir al inicio" onKeyDown={(e) => e.key === "Enter" && navg("/inicio")}>
            <BrandLogo caption={null} size="xs" testId="header-logo" />
          </div>
          <form className="search" onSubmit={runSearch} role="search">
            <Search size={18} aria-hidden="true" />
            <input data-testid="global-search-input" aria-label="Buscar en UAO Conecta" placeholder="Buscar asignatura, duda, persona o recurso…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </form>
          <button className="icon-btn mobile-only" aria-label="Configuración" onClick={() => navg("/configuracion")} data-testid="header-settings-button">
            <Settings2 size={19} aria-hidden="true" />
          </button>
          <div className="bell-wrap" ref={dropdownRef}>
            <button className="icon-btn" data-testid="notifications-button" onClick={() => setNotifOpen((o) => !o)} aria-label={bellCount ? `Notificaciones, ${bellCount} sin leer` : "Notificaciones"} aria-expanded={notifOpen}>
              <Bell size={19} aria-hidden="true" />
              {bellCount > 0 && <em className="bell-badge" data-testid="notifications-badge">{bellCount > 9 ? "9+" : bellCount}</em>}
            </button>
            {notifOpen && (
              <div className="notif-dropdown" data-testid="notif-dropdown">
                <div className="notif-dropdown-head">
                  <b>Notificaciones</b>
                  <button className="link" onClick={() => notif.markAllRead()} data-testid="dropdown-mark-all-read"><CheckCheck size={13} /> Marcar todo como leído</button>
                </div>
                {notif.items.length ? (
                  <ul>
                    {notif.items.slice(0, 6).map((n) => (
                      <li key={n.id} className={n.read ? "" : "unread"} onClick={() => { if (!n.read) notif.markRead(n.id); if (n.link) navg(n.link); setNotifOpen(false); }} data-testid={`dropdown-notif-${n.id}`}>
                        <b>{n.title}</b><p>{n.body}</p>
                        <small>{new Date(n.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</small>
                      </li>
                    ))}
                  </ul>
                ) : <p className="muted small" style={{ padding: 16 }}>Sin notificaciones nuevas.</p>}
                <button className="ghost small notif-see-all" onClick={() => { setNotifOpen(false); navg("/notificaciones"); }} data-testid="see-all-notifications">Ver todas</button>
              </div>
            )}
          </div>
        </header>
        {children}
      </main>
      <LogoutDialog open={confirmLogout} onCancel={() => setConfirmLogout(false)} onConfirm={() => { setConfirmLogout(false); onLogout(); }} />
      <nav className="bottom-nav" aria-label="Navegación móvil">
        {mobileNav.map((n) => {
          const active = loc.pathname.startsWith(n.path);
          return (
            <button key={n.path} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => navg(n.path)} data-testid={`mobile-nav-${n.label}`}>
              <n.icon size={18} aria-hidden="true" />
              <span>{n.label}</span>
              {n.path === "/chat" && totalUnread > 0 && <em className="mobile-nav-dot" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
