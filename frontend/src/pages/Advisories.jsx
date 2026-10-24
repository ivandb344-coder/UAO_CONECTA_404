import { useCallback, useEffect, useState } from "react";
import { Plus, Clock3, X, CheckCircle2, Edit3, Trash2, Power, MapPin, Video, CircleAlert, ChevronDown, ChevronUp, CalendarDays, List, Inbox, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Empty } from "@/components/ui/states";
import AdvisoryCalendar, { advisoryDateInput, advisoryDateLabel, advisoryHasPassed, advisoryTimeInput, advisoryTimeRange } from "@/components/AdvisoryCalendar";

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
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="advisory-list">
      {items.length ? (
        items.map((x) => {
          const mine = user && x.advisor_id === user.id;
          const full = x.available === 0;
          const passed = advisoryHasPassed(x);
          const inactive = x.active === false;
          const unavailable = full || passed || inactive;
          const expanded = expandedId === x.id;
          const detailsId = `advisory-details-${x.id}`;
          return (
          <div className="advisory" key={x.id} data-testid={`advisory-${x.id}`}>
            <div className="advisor-avatar">{(x.advisor || "?")[0]}</div>
            <div className="advisory-info">
              <div className="advisory-meta">
                <span>{x.role}</span>
                {mine && <span className="status info">Tu espacio</span>}
                <span className={`availability ${unavailable ? "full" : ""}`} role="status" data-testid={`availability-${x.id}`}>
                  {unavailable ? <CircleAlert size={15} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
                  {inactive ? "No disponible" : passed ? "Fecha pasada" : full ? "Cupo completo" : `${x.available} cupos disponibles`}
                </span>
              </div>
              <h3>{x.advisor}</h3>
              <p>
                {x.subject} · {x.topic}
              </p>
              <div className="advisory-actions">
                <button
                  type="button"
                  className="ghost small advisory-details-toggle"
                  aria-expanded={expanded}
                  aria-controls={detailsId}
                  onClick={() => setExpandedId(expanded ? null : x.id)}
                  data-testid={`advisory-details-toggle-${x.id}`}
                >
                  {expanded ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
                  {expanded ? "Ocultar asignatura y horario" : "Ver asignatura y horario"}
                </button>
                <div id={detailsId} className="advisory-detail-panel" hidden={!expanded}>
                  <dl>
                    <div><dt>Asignatura</dt><dd>{x.subject}</dd></div>
                    <div><dt>Tema</dt><dd>{x.topic}</dd></div>
                    <div><dt>Horario</dt><dd><Clock3 size={14} aria-hidden="true" /> {advisoryDateLabel(x.date)} · {x.time}</dd></div>
                    <div><dt>Modalidad</dt><dd>{x.mode}</dd></div>
                    {x.place && <div><dt>Lugar</dt><dd><MapPin size={14} aria-hidden="true" /> {x.place}</dd></div>}
                    {x.link && <div><dt>Acceso</dt><dd><Video size={14} aria-hidden="true" /> Enlace virtual incluido en la asesoría</dd></div>}
                  </dl>
                </div>
              </div>
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
                disabled={unavailable}
                onClick={() => onBook(x)}
                data-testid={`book-advisory-${x.id}`}
              >
                {inactive ? "No disponible" : passed ? "Fecha pasada" : full ? "Sin cupos" : "Solicitar asesoría"}
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
  const activeStatuses = ["Pendiente", "Aceptada"];
  const groups = {
    "Próximas asesorías": bookings.filter((b) => activeStatuses.includes(b.status) && !advisoryHasPassed(b)),
    Realizadas: bookings.filter((b) => b.status === "Completada"),
    Historial: bookings.filter((b) => (activeStatuses.includes(b.status) && advisoryHasPassed(b)) || ["Cancelada", "Rechazada", "No asistió"].includes(b.status)),
  };
  return (
    <>
      {Object.entries(groups).map(([label, list]) => (
        <div key={label} className="advisory-group">
          <div className="section-title compact">
            <h3>{label}</h3>
            <span>{list.length}</span>
          </div>
          {label === "Realizadas" && <p className="booking-history-hint">El estado “Realizada” corresponde a una asesoría que el profesor o monitor marcó como completada.</p>}
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
                      <Clock3 size={16} /> {advisoryDateLabel(b.date)} · {b.time}
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
  const [form, setForm] = useState(() => initial
    ? { ...initial, date: advisoryDateInput(initial.date), startTime: advisoryTimeInput(initial.time, 0), endTime: advisoryTimeInput(initial.time, 1) }
    : { subject: "", topic: "", date: "", startTime: "", endTime: "", mode: "Virtual", slots: 4, place: "", link: "", active: true });
  const [timeError, setTimeError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!form.startTime || !form.endTime || form.endTime <= form.startTime) {
      setTimeError("Selecciona una hora final posterior a la hora de inicio.");
      return;
    }
    setTimeError("");
    onSubmit({
      subject: form.subject,
      topic: form.topic,
      date: form.date,
      time: advisoryTimeRange(form.startTime, form.endTime),
      mode: form.mode,
      slots: Number(form.slots),
      place: form.place,
      link: form.link,
      active: form.active,
    });
  };

  return (
    <form
      className="composer"
      onSubmit={submit}
    >
      <h3>{initial ? "Editar espacio" : "Nuevo espacio de asesoría"}</h3>
      <p className="advisory-form-intro">Elige el día, define el horario completo y señala cuántos estudiantes pueden solicitar este espacio.</p>
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
          Fecha
          <input
            data-testid="advisory-date-input"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <small className="field-hint">Elige el día en el calendario del dispositivo.</small>
        </label>
        <fieldset className="advisory-time-fields">
          <legend>Horario</legend>
          <label>
            Inicio
            <input data-testid="advisory-time-input" type="time" required value={form.startTime} onChange={(e) => { setForm({ ...form, startTime: e.target.value }); setTimeError(""); }} />
          </label>
          <label>
            Fin
            <input data-testid="advisory-end-time-input" type="time" required value={form.endTime} onChange={(e) => { setForm({ ...form, endTime: e.target.value }); setTimeError(""); }} />
          </label>
          {timeError && <p className="field-error" role="alert">{timeError}</p>}
        </fieldset>
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
                <Clock3 size={16} /> {advisoryDateLabel(x.date)} · {x.time}
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
  const activeStatuses = ["Pendiente", "Aceptada"];
  const groups = [
    { label: "Próximas citas", items: items.filter((b) => activeStatuses.includes(b.status) && !advisoryHasPassed(b)) },
    { label: "Pasadas por cerrar", items: items.filter((b) => activeStatuses.includes(b.status) && advisoryHasPassed(b)) },
    { label: "Resultado registrado", items: items.filter((b) => ["Completada", "No asistió"].includes(b.status)) },
    { label: "Solicitudes canceladas o rechazadas", items: items.filter((b) => ["Cancelada", "Rechazada"].includes(b.status)) },
  ];
  const orderedGroups = groups.map((group) => ({
    ...group,
    items: [...group.items].sort((a, b) => {
      const dateA = advisoryDateInput(a.date) || "9999-12-31";
      const dateB = advisoryDateInput(b.date) || "9999-12-31";
      return group.label === "Próximas citas" ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
    }),
  })).filter((group) => group.items.length);

  const renderBooking = (b) => (
          <div className="advisory" key={b.id} data-testid={`incoming-${b.id}`}>
            <div className="advisor-avatar">{(b.student || "?")[0]}</div>
            <div className="advisory-info">
              <div className="advisory-meta">
                <BookingStatusPill status={b.status} />
                {advisoryHasPassed(b) && activeStatuses.includes(b.status) && <span className="status muted">Fecha pasada · falta cerrar</span>}
                <span>{b.subject}</span>
              </div>
              <h3>{b.student}</h3>
              <p>{b.topic} · {advisoryDateLabel(b.date)} · {b.time}</p>
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
  );

  return items.length ? (
    <>
      {orderedGroups.map((group) => (
        <section className="advisory-group" key={group.label}>
          <div className="section-title compact"><h3>{group.label}</h3><span>{group.items.length}</span></div>
          <div className="advisory-list">{group.items.map(renderBooking)}</div>
        </section>
      ))}
    </>
  ) : <Empty text="Sin solicitudes por ahora" />;
}

export default function Advisories({ user }) {
  const isAdvisor = user.role !== "student";
  const [tab, setTab] = useState(isAdvisor ? "agenda" : "browse");
  const [scheduleView, setScheduleView] = useState("calendar");
  const [advisories, setAdvisories] = useState([]);
  const [myAgenda, setMyAgenda] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [booked, setBooked] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSaving, setBookingSaving] = useState(false);
  const [note, setNote] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
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
  }, [isAdvisor]);

  useEffect(() => {
    load();
  }, [load]);

  const reserve = async () => {
    if (!selected || bookingSaving) return;
    setBookingSaving(true);
    setBookingError("");
    try {
      await api.post("/bookings", { advisory_id: selected.id, note });
      setBooked(true);
      setNote("");
      load();
    } catch (x) {
      setBookingError(x.response?.data?.detail || "No pudimos enviar la solicitud para ese horario.");
    } finally {
      setBookingSaving(false);
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
        { key: "agenda", label: "Mi agenda", description: "Disponibilidad y sesiones", icon: CalendarDays, count: myAgenda.length + incoming.length },
        { key: "incoming", label: "Citas y solicitudes", description: "Revisa y gestiona", icon: Inbox, count: incoming.filter((b) => b.status === "Pendiente").length },
        { key: "browse", label: "Explorar", description: "Otros espacios de asesoría", icon: Search },
      ]
    : [
        { key: "browse", label: "Explorar espacios", description: "Busca horarios y cupos", icon: Search },
        { key: "mine", label: "Mis asesorías", description: "Próximas, realizadas e historial", icon: CalendarDays, count: bookings.length },
      ];

  const agendaCalendarItems = [
    ...myAgenda.map((item) => ({ ...item, calendarType: "availability", calendarId: `space-${item.id}` })),
    ...incoming.map((item) => ({ ...item, calendarType: "booking", calendarId: `booking-${item.id}` })),
  ];
  const browseAdvisories = advisories.filter((item) => item.advisor_id !== user.id && item.active !== false && !advisoryHasPassed(item));
  const calendarItems = tab === "browse" ? browseAdvisories : tab === "mine" ? bookings : tab === "agenda" ? agendaCalendarItems : incoming;
  const calendarDescription = tab === "browse"
    ? "Toca un espacio con cupos para ver la fecha, el horario y enviar tu solicitud. Usa Lista para comparar todos los detalles."
    : tab === "mine"
      ? "Consulta tus reservas por fecha. El historial reúne las asesorías realizadas, pasadas, canceladas o sin asistencia."
      : tab === "agenda"
        ? "Tu disponibilidad y las sesiones con estudiantes aparecen juntas; los colores indican si es un espacio o una cita."
        : "Las solicitudes se muestran en la fecha acordada. Cambia a Lista para aceptar, rechazar o actualizar su estado.";

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

      <div className="tabs advisories-tabs" role="tablist" aria-label="Secciones de asesorías" data-testid="advisories-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
            role="tab"
            aria-selected={tab === t.key}
            data-testid={`tab-${t.key}`}
          >
            <span className="advisory-tab-title"><t.icon size={17} aria-hidden="true" /><strong>{t.label}</strong>{t.count > 0 && <em>{t.count}</em>}</span>
            <small>{t.description}</small>
          </button>
        ))}
      </div>

      <div className="advisory-view-header">
        <div className="advisory-view-copy">
          <p className="eyebrow">{scheduleView === "calendar" ? "VISTA DE CALENDARIO" : "VISTA DE LISTA"}</p>
          <h2>{scheduleView === "calendar" ? "Calendario de asesorías" : "Lista de asesorías"}</h2>
          <p>{calendarDescription}</p>
        </div>
        <div className="advisory-view-toggle" role="group" aria-label="Elige cómo ver las asesorías">
          <button type="button" className={scheduleView === "calendar" ? "active" : ""} aria-pressed={scheduleView === "calendar"} onClick={() => setScheduleView("calendar")} data-testid="advisory-calendar-view">
            <CalendarDays size={19} aria-hidden="true" /><span><strong>Calendario</strong><small>Ver por fecha</small></span>
          </button>
          <button type="button" className={scheduleView === "list" ? "active" : ""} aria-pressed={scheduleView === "list"} onClick={() => setScheduleView("list")} data-testid="advisory-list-view">
            <List size={19} aria-hidden="true" /><span><strong>Lista</strong><small>Ver detalles</small></span>
          </button>
        </div>
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

      {scheduleView === "calendar" ? (
        <AdvisoryCalendar
          items={calendarItems}
          kind={tab}
          onSelect={tab === "browse"
            ? (item) => {
                if (!item.available) return;
                setSelected(item);
                setBooked(false);
                setBookingError("");
                setNote("");
              }
            : tab === "agenda"
              ? (item) => {
                  if (item.calendarType === "booking") {
                    setTab("incoming");
                    setScheduleView("list");
                  } else {
                    setEditing(item);
                    setFormOpen(true);
                  }
                }
              : undefined}
        />
      ) : (
        <>
          {tab === "browse" && (
            <BrowseAdvisories
              items={browseAdvisories}
              user={user}
              onBook={(x) => {
                setSelected(x);
                setBooked(false);
                setBookingError("");
                setNote("");
              }}
              onManage={() => setTab(isAdvisor ? "agenda" : "browse")}
            />
          )}
          {tab === "mine" && <MyBookings bookings={bookings} onCancel={cancelBooking} />}
          {tab === "agenda" && (
            <>
              <MyAgenda
                items={myAgenda}
                onEdit={(x) => {
                  setEditing(x);
                  setFormOpen(true);
                }}
                onDelete={deleteAdvisory}
                onToggle={toggleAdvisory}
              />
              <IncomingBookings items={incoming} onStatus={changeIncomingStatus} />
            </>
          )}
          {tab === "incoming" && <IncomingBookings items={incoming} onStatus={changeIncomingStatus} />}
        </>
      )}

      {selected && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title" data-testid="booking-modal">
            <button className="close" aria-label="Cerrar solicitud de asesoría" onClick={() => setSelected(null)} data-testid="close-booking-modal">
              <X />
            </button>
            <p className="eyebrow">SOLICITUD DE ASESORÍA</p>
            <h2 id="booking-modal-title">{selected.topic}</h2>
            <p className="modal-detail">
              {selected.advisor} · {selected.subject}
            </p>
            <div className="booking-schedule-summary">
              <CalendarDays size={17} aria-hidden="true" />
              <span><strong>{advisoryDateLabel(selected.date)}</strong><br />{selected.time} · {selected.mode}<br />{selected.available} de {selected.slots} cupos disponibles</span>
            </div>
            {booked ? (
              <div className="success" data-testid="booking-success">
                <CheckCircle2 /> Tu solicitud fue enviada correctamente. Te avisaremos cuando la revisen.
              </div>
            ) : (
              <>
                {bookingError && <div className="error booking-error" role="alert" data-testid="booking-error">{bookingError}</div>}
                <label>
                  ¿En qué necesitas ayuda?
                  <textarea
                    data-testid="booking-note-input"
                    placeholder="Escribe brevemente el tema…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </label>
                <button className="primary wide" onClick={reserve} disabled={bookingSaving} aria-busy={bookingSaving} data-testid="confirm-booking-button">
                  {bookingSaving ? "Enviando solicitud…" : "Enviar solicitud"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
