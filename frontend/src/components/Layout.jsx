import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Search, Bell, LogOut } from "lucide-react";
import { NAV, roleLabel } from "@/lib/nav";

export default function Layout({ user, onLogout, children }) {
  const loc = useLocation();
  const navg = useNavigate();
  const [search, setSearch] = useState("");
  return (
    <div className="shell">
      <aside>
        <div className="brand-mark">
          UAO <span>Conecta</span>
        </div>
        <div className="sidebar-user">
          <div className="avatar">{user.name[0]}</div>
          <div>
            <strong data-testid="sidebar-user-name">{user.name}</strong>
            <small>{roleLabel(user.role)}</small>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <button
              key={n.path}
              className={loc.pathname.startsWith(n.path) ? "active" : ""}
              data-testid={`nav-${n.label.toLowerCase().replaceAll(" ", "-")}`}
              onClick={() => navg(n.path)}
            >
              <n.icon size={18} />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => navg("/perfil")} data-testid="nav-profile">
            <div className="avatar mini">{user.name[0]}</div> Mi perfil
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
          <div className="search">
            <Search size={18} />
            <input
              data-testid="global-search-input"
              placeholder="Buscar una asignatura, duda, persona o recurso…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="icon-btn" data-testid="notifications-button">
            <Bell size={19} />
            <i />
          </button>
        </header>
        {children}
      </main>
      <div className="bottom-nav">
        {NAV.slice(0, 5).map((n) => (
          <button
            key={n.path}
            className={loc.pathname.startsWith(n.path) ? "active" : ""}
            onClick={() => navg(n.path)}
            data-testid={`mobile-nav-${n.label}`}
          >
            <n.icon size={18} />
            <span>{n.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
