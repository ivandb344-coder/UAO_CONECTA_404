import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings2, Search, Bell, LogOut, CheckCheck, PlayCircle } from "lucide-react";
import { navForRole } from "@/lib/nav";
import { useChatUnread } from "@/lib/chatUnread";
import { useNotifications } from "@/lib/notifications";
import { useViewMode } from "@/lib/viewMode";
import Avatar from "@/components/Avatar";
import BrandLogo from "@/components/BrandLogo";
import LogoutDialog from "@/components/LogoutDialog";
import RoleBadge from "@/components/hub/RoleBadge";
import MonitorToggle from "@/components/hub/MonitorToggle";
import PresentationMode from "@/components/PresentationMode";
import { getUiLabel, playUiSound, speakUiLabel } from "@/lib/audioFeedback";

function readRecentSearches(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(stored) ? stored.filter((item) => typeof item === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

export default function Layout({ user, onLogout, children }) {
  const loc = useLocation();
  const navg = useNavigate();
  const { viewRole } = useViewMode();
  const NAV = navForRole(viewRole);
  const recentSearchesKey = `uao_recent_searches_${user?.id || user?.email || "session"}`;
  const [search, setSearch] = useState("");
  const [recentSearches, setRecentSearches] = useState(() => readRecentSearches(recentSearchesKey));
  const [searchHistoryOpen, setSearchHistoryOpen] = useState(false);
  const unread = useChatUnread();
  const notif = useNotifications();
  const totalUnread = unread.total || 0;
  const [notifOpen, setNotifOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const searchWrapRef = useRef(null);

  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [notifOpen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        setSearchHistoryOpen(true);
      } else if (event.key === "Escape") {
        setSearchHistoryOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let keyboardNavigation = false;
    const actionSelector = "button, a[href], [role='button'], [role='tab'], [role='switch'], input[type='submit']";
    const onKeyDown = (event) => {
      if (["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) keyboardNavigation = true;
    };
    const onPointerDown = () => { keyboardNavigation = false; };
    const onFocusIn = (event) => {
      const control = event.target?.closest?.(actionSelector);
      if (keyboardNavigation && control) speakUiLabel(getUiLabel(control));
    };
    const onClick = (event) => {
      const control = event.target?.closest?.(actionSelector);
      if (!control || control.disabled || control.getAttribute("aria-disabled") === "true") return;
      playUiSound("click");
      speakUiLabel(getUiLabel(control));
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const title = document.querySelector("main h1")?.textContent?.trim();
      if (title) speakUiLabel(`Sección: ${title}`);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [loc.pathname]);

  useEffect(() => {
    if (!searchHistoryOpen) return;
    const onClick = (event) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target)) setSearchHistoryOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [searchHistoryOpen]);

  const runSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    const nextRecent = [q, ...recentSearches.filter((item) => item.toLocaleLowerCase() !== q.toLocaleLowerCase())].slice(0, 5);
    setRecentSearches(nextRecent);
    try { localStorage.setItem(recentSearchesKey, JSON.stringify(nextRecent)); } catch { /* Search still works when storage is unavailable. */ }
    setSearchHistoryOpen(false);
    navg(`/buscar?q=${encodeURIComponent(q)}`);
  };

  const bellCount = notif.unread || 0;
  const mobileNav = NAV.filter((n) => ["/inicio", "/dudas", "/asignaturas", "/asesorias", "/chat", "/ranking", "/evidencias-dcu"].includes(n.path));

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
              <button key={n.path} className={active ? "active" : ""} aria-current={active ? "page" : undefined} data-testid={n.testId || `nav-${n.label.toLowerCase().replaceAll(" ", "-")}`} onClick={() => navg(n.path)}>
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
          <div className="global-search-wrap" ref={searchWrapRef}>
            <form className="search" onSubmit={runSearch} role="search">
              <Search size={18} aria-hidden="true" />
              <input
                ref={searchRef}
                data-testid="global-search-input"
                aria-label="Buscar en UAO Conecta"
                aria-keyshortcuts="Control+K Meta+K"
                aria-expanded={searchHistoryOpen && recentSearches.length > 0}
                placeholder="Buscar asignatura, duda, persona o recurso…"
                value={search}
                onFocus={() => { if (!search.trim() && recentSearches.length) setSearchHistoryOpen(true); }}
                onChange={(e) => { setSearch(e.target.value); if (e.target.value) setSearchHistoryOpen(false); }}
              />
              <kbd className="search-shortcut" aria-hidden="true">Ctrl K</kbd>
            </form>
            {searchHistoryOpen && recentSearches.length > 0 && (
              <div className="recent-searches" role="region" aria-label="Búsquedas recientes" data-testid="recent-searches">
                <div className="recent-searches-head">
                  <span>Búsquedas recientes en este dispositivo</span>
                  <button type="button" className="link" onClick={() => { setRecentSearches([]); try { localStorage.removeItem(recentSearchesKey); } catch { /* Search history is optional. */ } }} data-testid="clear-recent-searches">Borrar</button>
                </div>
                {recentSearches.map((query) => (
                  <button
                    type="button"
                    className="recent-search-item"
                    key={query}
                    onClick={() => { setSearch(query); setSearchHistoryOpen(false); navg(`/buscar?q=${encodeURIComponent(query)}`); }}
                  >
                    <Search size={14} aria-hidden="true" /> <span>{query}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="tour-launch" data-testid="presentation-mode-button" onClick={() => setTourOpen(true)} aria-label="Abrir tutorial guiado de UAO Conecta">
            <PlayCircle size={17} aria-hidden="true" /> <span>Tutorial guiado</span>
          </button>
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
                  <button className="link" onClick={async () => { await notif.markAllRead(); await unread.refresh(); }} data-testid="dropdown-mark-all-read"><CheckCheck size={13} /> Marcar todo como leído</button>
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
          <button
            className="mobile-profile"
            type="button"
            onClick={() => navg("/perfil")}
            aria-label="Mi perfil"
            title="Mi perfil"
            data-testid="mobile-profile-button"
          >
            <Avatar user={user} size="tiny" />
          </button>
          <button
            className="mobile-logout"
            type="button"
            onClick={() => setConfirmLogout(true)}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            data-testid="mobile-logout-button"
          >
            <LogOut size={18} aria-hidden="true" />
            <span>Salir</span>
          </button>
        </header>
        {children}
      </main>
      <LogoutDialog open={confirmLogout} onCancel={() => setConfirmLogout(false)} onConfirm={() => { setConfirmLogout(false); onLogout(); }} />
      <PresentationMode open={tourOpen} onClose={() => setTourOpen(false)} />
      <nav className="bottom-nav" aria-label="Navegación móvil">
        {mobileNav.map((n) => {
          const active = loc.pathname.startsWith(n.path);
          return (
            <button key={n.path} className={active ? "active" : ""} aria-label={n.label} aria-current={active ? "page" : undefined} onClick={() => navg(n.path)} data-testid={`mobile-nav-${n.mobileLabel || n.label}`}>
              <n.icon size={18} aria-hidden="true" />
              <span>{n.mobileLabel || n.label}</span>
              {n.path === "/chat" && totalUnread > 0 && <em className="mobile-nav-dot" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
