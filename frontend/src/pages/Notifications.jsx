import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCheck, Bell, Circle } from "lucide-react";
import { useNotifications } from "@/lib/notifications";
import { useChatUnread } from "@/lib/chatUnread";
import { Empty } from "@/components/ui/states";

const KIND_LABEL = {
  aceptada: "Solicitud aceptada",
  rechazada: "Solicitud rechazada",
  cancelada: "Reserva cancelada",
  completada: "Asesoría completada",
  no_asistió: "No asistió",
  chat_message: "Mensaje de chat",
};

export default function Notifications() {
  const { items, unread, refresh, markRead, markAllRead } = useNotifications();
  const { refresh: refreshChatUnread } = useChatUnread();
  const nav = useNavigate();
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    refresh();
  }, [refresh]);
  const visibleItems = items.filter((item) => filter === "all" || (filter === "unread" ? !item.read : item.read));
  const markEverythingRead = async () => {
    await markAllRead();
    await refreshChatUnread();
  };

  return (
    <section className="page notifications-page" data-testid="notifications-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">SABER · TU ACTIVIDAD</p>
          <h1>Notificaciones</h1>
          <p className="lede">Mensajes y novedades de tus asesorías, tareas y respuestas.</p>
        </div>
        {unread > 0 && (
          <button className="ghost" onClick={markEverythingRead} data-testid="mark-all-read-button">
            <CheckCheck size={15} /> Marcar todo como leído
          </button>
        )}
      </div>
      <div className="notification-filters" role="group" aria-label="Filtrar notificaciones">
        <button type="button" className={filter === "all" ? "active" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")} data-testid="notifications-filter-all">Todas ({items.length})</button>
        <button type="button" className={filter === "unread" ? "active" : ""} aria-pressed={filter === "unread"} onClick={() => setFilter("unread")} data-testid="notifications-filter-unread">Sin leer ({unread})</button>
        <button type="button" className={filter === "read" ? "active" : ""} aria-pressed={filter === "read"} onClick={() => setFilter("read")} data-testid="notifications-filter-read">Leídas ({items.filter((item) => item.read).length})</button>
      </div>
      {visibleItems.length ? (
        <ul className="notif-list">
          {visibleItems.map((n) => (
            <li
              key={n.id}
              className={`notif ${n.read ? "read" : "unread"}`}
              data-testid={`notif-${n.id}`}
              onClick={() => {
                if (!n.read) markRead(n.id);
                if (n.link) nav(n.link);
              }}
              role="button"
              tabIndex={0}
              aria-label={`${n.read ? "Leída" : "Sin leer"}: ${n.title}. ${n.body}`}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (!n.read) markRead(n.id);
                  if (n.link) nav(n.link);
                }
              }}
            >
              <div className={`notif-dot ${n.read ? "" : "active"}`}>
                {n.read ? <Bell size={14} /> : <Circle size={10} />}
              </div>
              <div className="notif-body">
                <b>{n.title}</b>
                <p>{n.body}</p>
                <small>
                  {KIND_LABEL[n.kind] || n.kind} ·{" "}
                  {new Date(n.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
                </small>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty text={filter === "unread" ? "Ya leíste todas tus notificaciones y mensajes." : filter === "read" ? "Aún no tienes notificaciones leídas." : "Aún no tienes notificaciones."} />
      )}
    </section>
  );
}
