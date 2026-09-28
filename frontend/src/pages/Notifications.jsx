import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCheck, Bell, Circle } from "lucide-react";
import { useNotifications } from "@/lib/notifications";
import { Empty } from "@/components/ui/states";

const KIND_LABEL = {
  aceptada: "Solicitud aceptada",
  rechazada: "Solicitud rechazada",
  cancelada: "Reserva cancelada",
  completada: "Asesoría completada",
  no_asistió: "No asistió",
};

export default function Notifications() {
  const { items, unread, refresh, markRead, markAllRead } = useNotifications();
  const nav = useNavigate();
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <section className="page notifications-page" data-testid="notifications-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">SABER · TU ACTIVIDAD</p>
          <h1>Notificaciones</h1>
          <p className="lede">Lo que pasa en tus asesorías, tareas y respuestas.</p>
        </div>
        {unread > 0 && (
          <button className="ghost" onClick={markAllRead} data-testid="mark-all-read-button">
            <CheckCheck size={15} /> Marcar todo como leído
          </button>
        )}
      </div>
      {items.length ? (
        <ul className="notif-list">
          {items.map((n) => (
            <li
              key={n.id}
              className={`notif ${n.read ? "read" : "unread"}`}
              data-testid={`notif-${n.id}`}
              onClick={() => {
                if (!n.read) markRead(n.id);
                if (n.link) nav(n.link);
              }}
              role="button"
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
        <Empty text="Aún no tienes notificaciones." />
      )}
    </section>
  );
}
