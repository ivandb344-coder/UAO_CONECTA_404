import { useEffect, useState } from "react";
import { Plus, Clock3, X, CheckCircle2, Edit3, Trash2, Power, MapPin, Video } from "lucide-react";
import { api } from "@/lib/api";
import { Empty } from "@/components/ui/states";

const STATUS_LABEL = {
  Pendiente: { cls: "open" },
  Aceptada: { cls: "info" },
  Rechazada: { cls: "danger" },
  Cancelada: { cls: "muted" },
  Completada: { cls: "done" },
  "No asistió": { cls: "danger" },
};

function BookingStatusPill({ status }) {
  const cfg = STATUS_LABEL[status] || { cls: "muted" };
  return (
    <span className={`status ${cfg.cls}`} data-testid={`booking-status-${status}`}>
      {status}
    </span>
  );
}

function BrowseAdvisories({ items, user, onBook, onManage }) {
  return (
    <div className="advisory-list">
      {items.length ? (
        items.map((x) => {
          const mine = user && x.advisor_id === user.id;
          return (
          <div className="advisory" key={x.id} data-testid={`advisory-${x.id}`}>
            <div className="advisor-avatar">{(x.advisor || "?")[0]}</div>
            <div className="advisory-info">
              <div className="advisory-meta">
                <span>{x.role}</span>
                {mine && <span className="status info">Tu espacio</span>}
                <span className={`availability ${x.available === 0 ? "full" : ""}`}>
                  <i /> {x.available === 0 ? "Cupo lleno" : `${x.available} cupos disponibles`}
                </span>
              </div>
              <h3>{x.advisor}</h3>
              <p>
                {x.subject} · {x.topic}
              </p>
              <div className="advisory-time">
                <Clock3 size={16} />
                {x.date} · {x.time}
                <span>{x.mode}</span>
              </div>
              {x.place && (
                <div className="advisory-meta-sm">
                  <MapPin size={13} /> {x.place}
                </div>
              )}
              {x.link && (
                <div className="advisory-meta-sm">
                  <Video size={13} /> Enlace virtual
                </div>
              )}
            </div>
            {mine ? (
              <button
                className="ghost small"
                onClick={onManage}
                data-testid={`manage-advisory-${x.id}`}
                title="Este es tu espacio: no puedes solicitarte a ti mismo"
              >
                Gestionar
              </button>
            ) : (
              <button
                className="primary small"
                disabled={x.available === 0}
                onClick={() => onBook(x)}
                data-testid={`book-advisory-${x.id}`}
              >
                {x.available === 0 ? "Cupo lleno" : "Solicitar cupo"}
              </button>
            )}
          </div>
        );})
      ) : (
        <Empty text="No hay asesorías publicadas todavía" />
      )}
    </div>
  );
}

function MyBookings({ bookings, onCancel }) {
  const groups = {
    Próximas: bookings.filter((b) => ["Pendiente", "Aceptada"].includes(b.status)),
    Completadas: bookings.filter((b) => b.status === "Completada"),
    Canceladas: bookings.filter((b) => ["Cancelada", "Rechazada", "No asistió"].includes(b.status)),
  };
  return (
    <>
      {Object.entries(groups).map(([label, list]) => (
        <div key={label} className="advisory-group">
          <div className="section-title compact">
            <h3>{label}</h3>
            <span>{list.length}</span>
          </div>
          {list.length ? (
            <div className="advisory-list">
              {list.map((b) => (
                <div className="advisory" key={b.id} data-testid={`my-booking-${b.id}`}>
                  <div className="advisor-avatar">{(b.advisor || "?")[0]}</div>
                  <div className="advisory-info">
                    <div className="advisory-meta">
                      <BookingStatusPill status={b.status} />
                      <span>{b.subject}</span>
                    </div>
                    <h3>{b.advisor}</h3>
                    <p>{b.topic}</p>
                    <div className="advisory-time">
                      <Clock3 size={16} /> {b.date} · {b.time}
                      <span>{b.mode}</span>
                    </div>
                  </div>
                  {["Pendiente", "Aceptada"].includes(b.status) && (
                    <button className="ghost small" onClick={() => onCancel(b)} data-testid={`cancel-booking-${b.id}`}>
                      Cancelar
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty text={`Sin asesorías ${label.toLowerCase()}`} />
          )}
        </div>
      ))}
    </>
  );
}

function AdvisoryForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(
    initial || { subject: "", topic: "", date: "", time: "", mode: "Virtual", slots: 4, place: "", link: "", active: true }
  );
  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <h3>{initial ? "Editar espacio" : "Nuevo espacio de asesoría"}</h3>
      <div className="task-fields">
        <label>
          Asignatura
          <input
            data-testid="advisory-subject-input"
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </label>
        <label>
          Tema
          <input
            data-testid="advisory-topic-input"
            required
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
          />
        </label>
      </div>
      <div className="task-fields">
        <label>
          Día / Fecha
          <input
            data-testid="advisory-date-input"
            required
            placeholder="Ej. Martes 30 de septiembre"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </label>
        <label>
          Hora
          <input
            data-testid="advisory-time-input"
            required
            placeholder="Ej. 3:00 p. m. – 3:30 p. m."
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
        </label>
      </div>
      <div className="task-fields">
        <label>
          Modalidad
          <select
            data-testid="advisory-mode-select"
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value })}
          >
            <option value="Virtual">Virtual</option>
            <option value="Presencial">Presencial</option>
            <option value="Mixta">Mixta</option>
          </select>
        </label>
        <label>
          Cupos
          <input
            data-testid="advisory-slots-input"
            type="number"
            min={1}
            max={30}
            value={form.slots}
            onChange={(e) => setForm({ ...form, slots: parseInt(e.target.value || 0, 10) })}
          />
        </label>
      </div>
      <div className="task-fields">
        <label>
          Lugar (si es presencial)
          <input
            data-testid="advisory-place-input"
            value={form.place}
            onChange={(e) => setForm({ ...form, place: e.target.value })}
          />
        </label>
        <label>
          Enlace virtual
          <input
            data-testid="advisory-link-input"
            value={form.link}
            onChange={(e) => setForm({ ...form, link: e.target.value })}
          />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="ghost" onClick={onCancel} data-testid="advisory-form-cancel">
          Cancelar
        </button>
        <button className="primary" data-testid="advisory-form-submit">
          {initial ? "Guardar cambios" : "Publicar espacio"}
        </button>
      </div>
    </form>
  );
}

function MyAgenda({ items, onEdit, onDelete, onToggle }) {
  return (
    <div className="advisory-list">
      {items.length ? (
        items.map((x) => (
          <div className={`advisory agenda ${x.active === false ? "inactive" : ""}`} key={x.id} data-testid={`agenda-${x.id}`}>
            <div className="advisor-avatar">{(x.subject || "?")[0]}</div>
            <div className="advisory-info">
              <div className="advisory-meta">
                <span>{x.mode}</span>
                <span className={`availability ${x.available === 0 ? "full" : ""}`}>
                  <i /> {x.booked}/{x.slots} reservados
                </span>
                {x.active === false && <span className="status muted">Desactivada</span>}
              </div>
              <h3>{x.subject}</h3>
              <p>{x.topic}</p>
              <div className="advisory-time">
                <Clock3 size={16} /> {x.date} · {x.time}
              </div>
            </div>
            <div className="agenda-actions">
              <button className="icon-mini" onClick={() => onToggle(x)} data-testid={`toggle-advisory-${x.id}`} title="Activar/Desactivar">
                <Power size={15} />
              </button>
              <button className="icon-mini" onClick={() => onEdit(x)} data-testid={`edit-advisory-${x.id}`} title="Editar">
                <Edit3 size={15} />
              </button>
              <button className="icon-mini danger" onClick={() => onDelete(x)} data-testid={`delete-advisory-${x.id}`} title="Eliminar">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))
      ) : (
        <Empty text="Aún no has publicado espacios de asesoría" />
      )}
    </div>
  );
}

function IncomingBookings({ items, onStatus }) {
  return (
    <div className="advisory-list">
      {items.length ? (
        items.map((b) => (
          <div className="advisory" key={b.id} data-testid={`incoming-${b.id}`}>
            <div className="advisor-avatar">{(b.student || "?")[0]}</div>
            <div className="advisory-info">
              <div className="advisory-meta">
                <BookingStatusPill status={b.status} />
                <span>{b.subject}</span>
              </div>
              <h3>{b.student}</h3>
              <p>{b.topic} · {b.date} · {b.time}</p>
              {b.note && <p className="note">“{b.note}”</p>}
            </div>
            <div className="agenda-actions">
              {b.status === "Pendiente" && (
                <>
                  <button className="primary small" onClick={() => onStatus(b, "Aceptada")} data-testid={`accept-${b.id}`}>
                    Aceptar
                  </button>
                  <button className="ghost small" onClick={() => onStatus(b, "Rechazada")} data-testid={`reject-${b.id}`}>
                    Rechazar
                  </button>
                </>
              )}
              {b.status === "Aceptada" && (
                <>
                  <button className="ghost small" onClick={() => onStatus(b, "Completada")} data-testid={`complete-${b.id}`}>
                    Completada
                  </button>
                  <button className="ghost small" onClick={() => onStatus(b, "No asistió")} data-testid={`noshow-${b.id}`}>
                    No asistió
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      ) : (
        <Empty text="Sin solicitudes por ahora" />
      )}
    </div>
  );
}

export default function Advisories({ user }) {
  const isAdvisor = user.role !== "student";
  const [tab, setTab] = useState(isAdvisor ? "agenda" : "browse");
  const [advisories, setAdvisories] = useState([]);
  const [myAgenda, setMyAgenda] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [booked, setBooked] = useState(false);
  const [note, setNote] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const calls = [api.get("/advisories"), api.get("/bookings")];
      if (isAdvisor) {
        calls.push(api.get("/advisories?mine=true"));
        calls.push(api.get("/bookings/incoming"));
      }
      const results = await Promise.all(calls);
      setAdvisories(results[0].data);
      setBookings(results[1].data);
      if (isAdvisor) {
        setMyAgenda(results[2].data);
        setIncoming(results[3].data);
      }
    } catch {
      setError("No pudimos cargar las asesorías.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const reserve = async () => {
    try {
      await api.post("/bookings", { advisory_id: selected.id, note });
      setBooked(true);
      setNote("");
      load();
    } catch (x) {
      setError(x.response?.data?.detail || "No pudimos reservar ese horario.");
    }
  };

  const cancelBooking = async (b) => {
    try {
      await api.patch(`/bookings/${b.id}/status`, { status: "Cancelada" });
      load();
    } catch {
      setError("No pudimos cancelar la reserva.");
    }
  };

  const saveAdvisory = async (payload) => {
    try {
      if (editing) await api.patch(`/advisories/${editing.id}`, payload);
      else await api.post("/advisories", payload);
      setFormOpen(false);
      setEditing(null);
      load();
    } catch (x) {
      setError(x.response?.data?.detail || "No pudimos guardar el espacio.");
    }
  };

  const toggleAdvisory = async (x) => {
    try {
      await api.patch(`/advisories/${x.id}`, { active: !(x.active !== false) });
      load();
    } catch {
      setError("No pudimos actualizar el espacio.");
    }
  };

  const deleteAdvisory = async (x) => {
    if (!window.confirm(`¿Eliminar el espacio "${x.subject} · ${x.topic}"?`)) return;
    try {
      await api.delete(`/advisories/${x.id}`);
      load();
    } catch {
      setError("No pudimos eliminar el espacio.");
    }
  };

  const changeIncomingStatus = async (b, status) => {
    try {
      await api.patch(`/bookings/${b.id}/status`, { status });
      load();
    } catch {
      setError("No pudimos actualizar la solicitud.");
    }
  };

  const tabs = isAdvisor
    ? [
        { key: "agenda", label: "Mi agenda" },
        { key: "incoming", label: `Solicitudes${incoming.length ? ` · ${incoming.filter((b) => b.status === "Pendiente").length}` : ""}` },
        { key: "browse", label: "Explorar" },
      ]
    : [
        { key: "browse", label: "Explorar" },
        { key: "mine", label: `Mis asesorías${bookings.length ? ` · ${bookings.length}` : ""}` },
      ];

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">COORDINAR · ACOMPAÑAMIENTO</p>
          <h1>Asesorías</h1>
          <p className="lede">
            {isAdvisor
              ? "Gestiona tu agenda, revisa solicitudes y acompaña a tus estudiantes."
              : "Encuentra un espacio y a alguien que pueda ayudarte."}
          </p>
        </div>
        {isAdvisor && tab === "agenda" && (
          <button
            className="primary"
            onClick={() => {
              setEditing(null);
              setFormOpen(!formOpen);
            }}
            data-testid="new-advisory-button"
          >
            <Plus size={17} /> Nuevo espacio
          </button>
        )}
      </div>

      {error && (
        <div className="error" data-testid="advisories-error" onClick={() => setError("")}>
          {error}
        </div>
      )}

      <div className="tabs" data-testid="advisories-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
            data-testid={`tab-${t.key}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isAdvisor && formOpen && (
        <AdvisoryForm
          initial={editing}
          onSubmit={saveAdvisory}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}

      {tab === "browse" && (
        <BrowseAdvisories
          items={advisories}
          user={user}
          onBook={(x) => {
            setSelected(x);
            setBooked(false);
          }}
          onManage={() => setTab(isAdvisor ? "agenda" : "browse")}
        />
      )}
      {tab === "mine" && <MyBookings bookings={bookings} onCancel={cancelBooking} />}
      {tab === "agenda" && (
        <MyAgenda
          items={myAgenda}
          onEdit={(x) => {
            setEditing(x);
            setFormOpen(true);
          }}
          onDelete={deleteAdvisory}
          onToggle={toggleAdvisory}
        />
      )}
      {tab === "incoming" && <IncomingBookings items={incoming} onStatus={changeIncomingStatus} />}

      {selected && (
        <div className="modal-backdrop">
          <div className="modal" data-testid="booking-modal">
            <button className="close" onClick={() => setSelected(null)} data-testid="close-booking-modal">
              <X />
            </button>
            <p className="eyebrow">CONFIRMAR SOLICITUD</p>
            <h2>{selected.topic}</h2>
            <p className="modal-detail">
              {selected.advisor} · {selected.subject}
              <br />
              {selected.date} · {selected.time} · {selected.mode}
              <br />
              {selected.available} de {selected.slots} cupos disponibles
            </p>
            {booked ? (
              <div className="success" data-testid="booking-success">
                <CheckCircle2 /> Tu solicitud fue enviada correctamente. Te avisaremos cuando la revisen.
              </div>
            ) : (
              <>
                <label>
                  ¿En qué necesitas ayuda?
                  <textarea
                    data-testid="booking-note-input"
                    placeholder="Escribe brevemente el tema…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
                <button className="primary wide" onClick={reserve} data-testid="confirm-booking-button">
                  Confirmar solicitud
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
