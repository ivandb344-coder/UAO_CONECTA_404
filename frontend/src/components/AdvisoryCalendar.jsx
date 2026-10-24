import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const pad = (value) => String(value).padStart(2, "0");

export function advisoryDateKey(value) {
  const text = String(value || "").trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

export function advisoryDateInput(value) {
  const key = advisoryDateKey(value);
  return key || "";
}

function timePartToInput(value) {
  const text = String(value || "").trim().toLowerCase();
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (!match) return "";
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const isPm = /p\s*\.?\s*m\.?|\bpm\b/.test(text);
  const isAm = /a\s*\.?\s*m\.?|\bam\b/.test(text);
  if (isPm && hour < 12) hour += 12;
  if (isAm && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return "";
  return `${pad(hour)}:${pad(minute)}`;
}

export function advisoryTimeInput(value, part = 0) {
  const ranges = String(value || "").split(/\s*[–—-]\s*/);
  return timePartToInput(ranges[part] || (part === 0 ? ranges[0] : ""));
}

export function advisoryTimeLabel(value) {
  if (!value) return "";
  const [hour, minute] = String(value).split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function advisoryTimeRange(start, end) {
  const first = advisoryTimeLabel(start);
  const last = advisoryTimeLabel(end);
  return last ? `${first} – ${last}` : first;
}

export function advisoryDateLabel(value, options = { weekday: "long", day: "numeric", month: "long", year: "numeric" }) {
  const key = advisoryDateKey(value);
  if (!key) return value || "Fecha pendiente";
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-CO", options);
}

export function advisoryHasPassed(item, now = new Date()) {
  const key = advisoryDateKey(item?.date);
  if (!key) return false;
  const time = advisoryTimeInput(item?.time, 1) || advisoryTimeInput(item?.time, 0) || "23:59";
  const [year, month, day] = key.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute) < now;
}

function minuteOfDay(value) {
  const input = timePartToInput(String(value || "").split(/\s*[–—-]\s*/)[0]);
  if (!input) return Number.MAX_SAFE_INTEGER;
  const [hour, minute] = input.split(":").map(Number);
  return hour * 60 + minute;
}

function initialMonth(items) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const dates = items.map((item) => advisoryDateKey(item.date)).filter(Boolean).sort();
  const nearest = dates.find((key) => key >= todayKey) || dates[0] || todayKey;
  const [year, month] = nearest.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function eventTitle(item, kind) {
  if (item.calendarType === "booking") return item.student || "Sesión con estudiante";
  if (kind === "incoming") return item.student || item.advisor || item.subject || "Solicitud";
  if (kind === "agenda") return item.subject || item.topic || "Asesoría";
  return item.advisor || item.subject || item.topic || "Asesoría";
}

function eventDetail(item, kind) {
  if (item.calendarType === "booking") return `${item.status || "Cita"} · ${item.subject || "Asesoría"}`;
  if (kind === "browse") return item.active === false ? "No disponible" : advisoryHasPassed(item) ? "Fecha pasada" : `${item.available ?? 0} de ${item.slots ?? 0} cupos libres`;
  if (kind === "agenda") return `${item.booked ?? 0} de ${item.slots ?? 0} reservados`;
  if (kind === "incoming" || kind === "mine") return item.status || item.mode || "Asesoría";
  return item.mode || "Asesoría";
}

export default function AdvisoryCalendar({ items = [], kind = "browse", onSelect }) {
  const [month, setMonth] = useState(() => initialMonth(items));
  const positioned = useRef(false);
  useEffect(() => {
    if (items.length && !positioned.current) {
      setMonth(initialMonth(items));
      positioned.current = true;
    }
  }, [items]);
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthLabel = month.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  const eventsByDay = useMemo(() => {
    const grouped = new Map();
    items.forEach((item) => {
      const key = advisoryDateKey(item.date);
      if (!key) return;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });
    grouped.forEach((events) => events.sort((a, b) => minuteOfDay(a.time) - minuteOfDay(b.time)));
    return grouped;
  }, [items]);

  const offset = (firstDay.getDay() + 6) % 7;
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((offset + dayCount) / 7) * 7;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const cells = Array.from({ length: cellCount }, (_, index) => {
    const day = index - offset + 1;
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    return { date, key, inMonth: day >= 1 && day <= dayCount };
  });
  const unscheduled = items.filter((item) => !advisoryDateKey(item.date));
  const legend = kind === "agenda"
    ? [
        { key: "agenda", label: "Disponibilidad publicada" },
        { key: "pending", label: "Solicitud pendiente" },
        { key: "accepted", label: "Cita aceptada" },
        { key: "completed", label: "Realizada" },
        { key: "history", label: "Pasada o cancelada" },
      ]
    : kind === "mine"
      ? [{ key: "pending", label: "Pendiente o aceptada" }, { key: "completed", label: "Realizada" }, { key: "history", label: "Pasada o cancelada" }]
      : kind === "incoming"
        ? [{ key: "pending", label: "Por revisar" }, { key: "completed", label: "Realizada" }, { key: "history", label: "No realizada o cancelada" }]
        : [{ key: "browse", label: "Espacio disponible" }];

  return (
    <section className="advisory-calendar" aria-label="Calendario de asesorías" data-testid="advisory-calendar">
      <div className="calendar-toolbar">
        <div>
          <p className="eyebrow"><CalendarDays size={14} aria-hidden="true" /> AGENDA</p>
          <h2>{monthLabel}</h2>
        </div>
        <div className="calendar-month-controls" role="group" aria-label="Cambiar mes">
          <button type="button" className="icon-mini" aria-label="Mes anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
          <button type="button" className="ghost small" onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Hoy</button>
          <button type="button" className="icon-mini" aria-label="Mes siguiente" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="advisory-calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="advisory-calendar-legend" role="list" aria-label="Significado de los colores">
        {legend.map((item) => <span key={item.key} role="listitem"><i className={`legend-${item.key}`} aria-hidden="true" />{item.label}</span>)}
      </div>
      <div className="advisory-calendar-grid">
        {cells.map(({ date, key, inMonth }) => {
          const dayEvents = eventsByDay.get(key) || [];
          return (
            <div
              key={key}
              className={`calendar-day ${inMonth ? "" : "outside-month"} ${key === todayKey ? "today" : ""} ${key < todayKey ? "past-day" : ""}`}
              aria-label={`${advisoryDateLabel(key, { weekday: "long", day: "numeric", month: "long" })}, ${dayEvents.length} asesorías`}
            >
              <span className="calendar-day-number">{date.getDate()}</span>
              <div className="calendar-day-events">
                {dayEvents.slice(0, 3).map((item) => {
                  const title = eventTitle(item, kind);
                  const detail = eventDetail(item, kind);
                  const eventKind = item.calendarType === "booking" ? "appointment" : kind;
                  const hasPassed = advisoryHasPassed(item);
                  const unavailable = kind === "browse" && (!item.available || item.active === false || hasPassed);
                  const statusClass = item.calendarType === "availability" && hasPassed
                    ? "status-history"
                    : hasPassed && ["Pendiente", "Aceptada"].includes(item.status)
                      ? "status-history"
                      : item.status === "Completada"
                        ? "status-completed"
                        : item.status === "Pendiente"
                          ? "status-pending"
                          : ["Cancelada", "Rechazada", "No asistió"].includes(item.status)
                            ? "status-history"
                            : item.status === "Aceptada"
                              ? "status-accepted"
                              : "";
                  const visibleDetail = kind === "browse" && item.active === false
                    ? "No disponible"
                    : hasPassed && ["Pendiente", "Aceptada"].includes(item.status)
                    ? `Pasada · ${detail}`
                    : item.calendarType === "availability" && hasPassed
                      ? "Disponibilidad pasada"
                      : detail;
                  const eventKey = item.calendarId || item.id;
                  const contents = <><span><Clock3 size={11} aria-hidden="true" /> {item.time || "Hora pendiente"}</span><strong>{title}</strong><small>{visibleDetail}</small></>;
                  return onSelect ? (
                    <button type="button" key={eventKey} className={`calendar-event kind-${eventKind} ${statusClass} ${unavailable ? "full" : ""}`} disabled={unavailable} onClick={() => onSelect(item)} aria-label={`${title}, ${item.time || "hora pendiente"}, ${visibleDetail}`} data-testid={`calendar-event-${eventKey}`}>
                      {contents}
                    </button>
                  ) : (
                    <div key={eventKey} className={`calendar-event kind-${eventKind} ${statusClass}`} data-testid={`calendar-event-${eventKey}`}>
                      {contents}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && <span className="calendar-more">+{dayEvents.length - 3} más</span>}
              </div>
            </div>
          );
        })}
      </div>

      {!items.length && <p className="calendar-empty">No hay espacios para este calendario todavía. Cambia a “Lista” para revisar el detalle.</p>}
      {!!unscheduled.length && (
        <aside className="calendar-legacy-note" data-testid="calendar-legacy-dates">
          <strong>{unscheduled.length} {unscheduled.length === 1 ? "espacio conserva" : "espacios conservan"} una fecha en texto</strong>
          <span>Para ubicarlos en el calendario, edítalos y selecciona una fecha del calendario del dispositivo.</span>
        </aside>
      )}
    </section>
  );
}
