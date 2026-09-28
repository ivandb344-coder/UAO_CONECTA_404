import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Search, Bell, LogOut, CheckCheck } from "lucide-react";
import { NAV, roleLabel } from "@/lib/nav";
import { useChatUnread } from "@/lib/chatUnread";
import { useNotifications } from "@/lib/notifications";

export default function Layout({ user, onLogout, children }) {
  const loc = useLocation();
  const navg = useNavigate();
  const [search, setSearch] = useState("");
  const unread = useChatUnread();
  const notif = useNotifications();
  const totalUnread = unread.total || 0;
  const [notifOpen, setNotifOpen] = useState(false);
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

  return (
    <div className="shell">
      <aside>
        <div className="brand-mark">
          UAO <span>Conecta</span>
        </div>
        <div className="sidebar-user" onClick={() => navg("/perfil")} role="button">
          <div className="profile-avatar tiny">
            {user.picture ? <img src={user.picture} alt={user.name} /> : <span>{(user.name || "?")[0]}</span>}
          </div>
          <div>
            <strong data-testid="sidebar-user-name">{user.name}</strong>
            <small>{roleLabel(user.role)}</small>
          </div>
        </div>
        <nav>
          {NAV.map((n) => {
            const active = loc.pathname.startsWith(n.path);
            const chatDot = n.path === "/chat" && totalUnread > 0;
            return (
              <button
                key={n.path}
                className={active ? "active" : ""}
                data-testid={`nav-${n.label.toLowerCase().replaceAll(" ", "-")}`}
                onClick={() => navg(n.path)}
              >
                <n.icon size={18} />
                {n.label}
                {chatDot && <em className="nav-badge" data-testid="nav-chat-badge">{totalUnread}</em>}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => navg("/perfil")} data-testid="nav-profile">
            <div className="profile-avatar tiny">
              {user.picture ? <img src={user.picture} alt={user.name} /> : <span>{(user.name || "?")[0]}</span>}
            </div>{" "}
            Mi perfil
          </button>
          <button onClick={onLogout} data-testid="logout-button">
            <LogOut size={17} /> Salir
          </button>
        </div>
      </aside>
      <main className="content">
        <header>
          <button className="mobile-menu">
            <Menu />
          </button>
          <form className="search" onSubmit={runSearch}>
            <Search size={18} />
            <input
              data-testid="global-search-input"
              placeholder="Buscar una asignatura, duda, persona o recurso…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          <div className="bell-wrap" ref={dropdownRef}>
            <button
              className="icon-btn"
              data-testid="notifications-button"
              onClick={() => setNotifOpen((o) => !o)}
              aria-label="Notificaciones"
            >
              <Bell size={19} />
              {bellCount > 0 && (
                <em className="bell-badge" data-testid="notifications-badge">
                  {bellCount > 9 ? "9+" : bellCount}
                </em>
              )}
            </button>
            {notifOpen && (
              <div className="notif-dropdown" data-testid="notif-dropdown">
                <div className="notif-dropdown-head">
                  <b>Notificaciones</b>
                  <button
                    className="link"
                    onClick={() => notif.markAllRead()}
                    data-testid="dropdown-mark-all-read"
                  >
                    <CheckCheck size={13} /> Marcar todo como leído
                  </button>
                </div>
                {notif.items.length ? (
                  <ul>
                    {notif.items.slice(0, 6).map((n) => (
                      <li
                        key={n.id}
                        className={n.read ? "" : "unread"}
                        onClick={() => {
                          if (!n.read) notif.markRead(n.id);
                          if (n.link) navg(n.link);
                          setNotifOpen(false);
                        }}
                        data-testid={`dropdown-notif-${n.id}`}
                      >
                        <b>{n.title}</b>
                        <p>{n.body}</p>
                        <small>{new Date(n.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted small" style={{ padding: 16 }}>Sin notificaciones nuevas.</p>
                )}
                <button
                  className="ghost small notif-see-all"
                  onClick={() => {
                    setNotifOpen(false);
                    navg("/notificaciones");
                  }}
                  data-testid="see-all-notifications"
                >
                  Ver todas
                </button>
              </div>
            )}
          </div>
        </header>
        {children}
      </main>
      <div className="bottom-nav">
        {NAV.slice(0, 5).map((n) => {
          const chatDot = n.path === "/chat" && totalUnread > 0;
          return (
            <button
              key={n.path}
              className={loc.pathname.startsWith(n.path) ? "active" : ""}
              onClick={() => navg(n.path)}
              data-testid={`mobile-nav-${n.label}`}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {chatDot && <em className="mobile-nav-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
