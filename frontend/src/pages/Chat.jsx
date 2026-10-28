import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Paperclip, Send, Users, Wifi, WifiOff, FileText, X as XIcon, UserRoundPlus, Search, MessageCircle, Pencil, Trash2, Check } from "lucide-react";
import { api, API } from "@/lib/api";
import { openProtectedFile } from "@/services/fileService";
import { useProtectedFileUrl } from "@/hooks/useProtectedFile";
import { Empty } from "@/components/ui/states";
import { useChatUnread } from "@/lib/chatUnread";
import { useNotifications } from "@/lib/notifications";
import { playUiSound } from "@/lib/audioFeedback";

const WS_BASE = API.replace(/^http/, "ws");
const MAX_ATTACH_MB = 8;

const roleTag = (r) =>
  r === "professor" ? "Profesor" : r === "monitor" ? "Monitor" : "Estudiante";

function AttachmentPreview({ file, onClear }) {
  if (!file) return null;
  return (
    <div className="attach-pill" data-testid="chat-attach-pill">
      <FileText size={13} />
      <span>{file.name}</span>
      <button type="button" onClick={onClear} aria-label="Quitar adjunto" data-testid="chat-attach-clear">
        <XIcon size={13} />
      </button>
    </div>
  );
}

function MessageFile({ file }) {
  const src = useProtectedFileUrl(file?.storage_path);
  if (!file) return null;
  const isImage = (file.content_type || "").startsWith("image/");
  const open = () => openProtectedFile(file.storage_path, { filename: file.name || "adjunto" }).catch(() => {});
  if (isImage) {
    return src ? (
      <a href={src} target="_blank" rel="noreferrer" className="message-image">
        <img src={src} alt={file.name} loading="lazy" />
      </a>
    ) : (
      <span className="message-file">Cargando archivo…</span>
    );
  }
  return (
    <button type="button" onClick={open} className="message-file">
      <FileText size={14} /> {file.name}
    </button>
  );
}

export default function Chat({ user }) {
  const { room: routeRoom } = useParams();
  const nav = useNavigate();
  const room = routeRoom || "general";
  const unread = useChatUnread();
  const { refresh: refreshNotifications } = useNotifications();
  const refreshChatUnread = unread.refresh;
  const markChatRead = unread.markRead;
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState("connecting");
  const [presence, setPresence] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [directConversations, setDirectConversations] = useState([]);
  const [professorContacts, setProfessorContacts] = useState([]);
  const [directFeatureError, setDirectFeatureError] = useState("");
  const [directOpen, setDirectOpen] = useState(false);
  const [contactQuery, setContactQuery] = useState("");
  const [directLoading, setDirectLoading] = useState(false);
  const [attachment, setAttachment] = useState(null); // {name, storage_path, content_type, size}
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [messageBusy, setMessageBusy] = useState(false);
  const [roomClosedEvent, setRoomClosedEvent] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const wsRef = useRef(null);
  const messagesRef = useRef(null);
  const fileInputRef = useRef(null);
  const retryRef = useRef(0);
  const retryTimerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const knownMessageIdsRef = useRef(new Set());

  const directConversation = directConversations.find((item) => item.room === room);
  const isDirectRoom = room.startsWith("dm-");
  const roomSubject = subjects.find((item) => item.id === room);
  const roomClosed = roomClosedEvent || ["closed", "deleted"].includes(roomSubject?.status);

  const roomLabel = useMemo(() => {
    if (room === "general") return "Comunidad UAO";
    const direct = directConversations.find((item) => item.room === room);
    if (direct) return direct.other.name;
    const s = subjects.find((x) => x.id === room);
    return s ? s.name : isDirectRoom ? "Chat privado" : "Sala";
  }, [room, subjects, directConversations, isDirectRoom]);

  useEffect(() => {
    api.get("/subjects").then((r) => setSubjects(r.data)).catch(() => {});
    api.get("/chat/direct").then((r) => setDirectConversations(r.data)).catch(() => {});
    if (user.role === "student") {
      api.get("/chat/contacts/professors").then((r) => {
        setProfessorContacts(r.data);
        setDirectFeatureError("");
      }).catch((requestError) => {
        if (requestError.response?.status === 404) setDirectFeatureError("El servidor todavía no tiene habilitados los mensajes privados. Debe actualizarse la API para usar esta función.");
      });
    }
  }, [user.role]);

  useEffect(() => {
    setRoomClosedEvent(false);
    setEditingMessageId(null);
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [room]);

  const startDirectConversation = async (professor) => {
    setDirectLoading(true);
    setError("");
    try {
      const response = await api.post(`/chat/direct/${encodeURIComponent(professor.id)}`);
      const conversation = { room: response.data.room, other: response.data.other };
      setDirectConversations((current) => [conversation, ...current.filter((item) => item.room !== conversation.room)]);
      setDirectOpen(false);
      setContactQuery("");
      nav(`/chat/${encodeURIComponent(conversation.room)}`);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "No pudimos abrir el chat con ese docente.");
    } finally {
      setDirectLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setPresence([]);
    setConnected(false);
    setConnectionState("connecting");
    clearTimeout(retryTimerRef.current);
    clearInterval(pollTimerRef.current);
    api
      .get(`/chat/${room}`)
      .then((r) => {
        if (!cancelled) {
          knownMessageIdsRef.current = new Set(r.data.map((message) => message.id));
          setMessages(r.data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.response?.data?.detail || "No pudimos cargar los mensajes de esta sala.");
      });

    const openSocket = () => {
      const token = localStorage.getItem("uao_token");
      if (!token) {
        setConnectionState("unavailable");
        return;
      }
      let ws;
      try {
        ws = new WebSocket(`${WS_BASE}/ws/chat/${encodeURIComponent(room)}?token=${encodeURIComponent(token)}`);
      } catch {
        setConnectionState("retrying");
        return;
      }
      wsRef.current = ws;
      ws.onopen = () => {
        setConnected(true);
        setConnectionState("connected");
        retryRef.current = 0;
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      };
      ws.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload.type === "message") {
            const newMessage = payload.message && !knownMessageIdsRef.current.has(payload.message.id);
            if (payload.message?.id) knownMessageIdsRef.current.add(payload.message.id);
            if (newMessage && (payload.message?.system || (payload.message?.user_id && payload.message.user_id !== user?.id))) playUiSound("message");
            setMessages((prev) =>
              prev.some((m) => m.id === payload.message.id) ? prev : [...prev, payload.message]
            );
          } else if (payload.type === "message_updated") {
            setMessages((prev) => prev.map((message) => message.id === payload.message.id ? payload.message : message));
          } else if (payload.type === "message_deleted") {
            setMessages((prev) => prev.map((message) => message.id === payload.id ? { ...message, body: "", file: null, deleted: true, deleted_at: payload.deleted_at } : message));
          } else if (payload.type === "subject_closed" || payload.type === "subject_deleted") {
            setRoomClosedEvent(true);
            if (payload.message) {
              const newAnnouncement = !knownMessageIdsRef.current.has(payload.message.id);
              knownMessageIdsRef.current.add(payload.message.id);
              if (newAnnouncement) playUiSound("message");
              setMessages((prev) => prev.some((m) => m.id === payload.message.id) ? prev : [...prev, payload.message]);
            }
          } else if (payload.type === "presence") {
            setPresence(payload.users || []);
          }
        } catch {
          /* ignore */
        }
      };
      ws.onclose = (event) => {
        setConnected(false);
        if (cancelled) return;
        if (event.code === 4401) {
          setConnectionState("unauthorized");
          window.dispatchEvent(new CustomEvent("uao:unauthorized"));
          return;
        }
        if (event.code === 4403) {
          setConnectionState("forbidden");
          return;
        }
        if (event.code === 4404) {
          setConnectionState("unavailable");
          setError("Esta sala ya no está disponible para tu cuenta.");
          return;
        }
        retryRef.current += 1;
        if (retryRef.current >= 2) {
          const pollMessages = () => api.get(`/chat/${encodeURIComponent(room)}`).then((response) => {
            if (cancelled) return;
            const incoming = response.data.filter((message) => !knownMessageIdsRef.current.has(message.id));
            if (incoming.some((message) => message.system || (message.user_id && message.user_id !== user?.id))) playUiSound("message");
            incoming.forEach((message) => knownMessageIdsRef.current.add(message.id));
            setMessages(response.data);
            setConnectionState("polling");
          }).catch(() => {
            if (!cancelled) setConnectionState("retrying");
          });
          if (pollTimerRef.current === null) {
            setConnectionState("polling");
            pollMessages();
            pollTimerRef.current = window.setInterval(pollMessages, 5000);
          }
        } else {
          setConnectionState("retrying");
        }
        const wait = Math.min(1000 * (2 ** Math.min(retryRef.current - 1, 3)), 8000);
        retryTimerRef.current = window.setTimeout(() => {
          if (!cancelled) openSocket();
        }, wait);
      };
      ws.onerror = () => {
        setConnectionState("retrying");
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };
    };
    openSocket();
    return () => {
      cancelled = true;
      clearTimeout(retryTimerRef.current);
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
      try {
        wsRef.current?.close(1000, "Cambio de sala");
      } catch {
        /* ignore */
      }
    };
  }, [room, user?.id]);

  // Mark room as seen when we open it and every time a new message arrives while we're here
  useEffect(() => {
    if (!room) return;
    const ping = () => {
      markChatRead(room);
      api.post(`/chat/${encodeURIComponent(room)}/seen`)
        .then(() => refreshNotifications())
        .catch(() => refreshChatUnread());
    };
    ping();
    return () => {};
  }, [room, messages.length, markChatRead, refreshChatUnread, refreshNotifications]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const openFilePicker = () => fileInputRef.current?.click();

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_ATTACH_MB * 1024 * 1024) {
      setError(`El archivo supera los ${MAX_ATTACH_MB}MB permitidos en el chat.`);
      return;
    }
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/files", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setAttachment({
        name: r.data.name,
        storage_path: r.data.storage_path,
        content_type: r.data.content_type,
        size: file.size,
      });
    } catch {
      setError("No pudimos subir el archivo, intenta de nuevo.");
    }
    setUploading(false);
  };

  const send = (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text && !attachment) return;
    const payload = { body: text, file: attachment };
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(payload));
        setBody("");
        setAttachment(null);
        return;
      } catch {
        setConnected(false);
        setConnectionState("retrying");
      }
    }
    api.post("/chat", { ...payload, room }).then((r) => {
      knownMessageIdsRef.current.add(r.data.id);
      setMessages((prev) => (prev.some((m) => m.id === r.data.id) ? prev : [...prev, r.data]));
      setDirectConversations((current) => current.map((item) => item.room === room ? { ...item, last_message: r.data, updated_at: r.data.created_at } : item));
      setBody("");
      setAttachment(null);
    }).catch((requestError) => {
      setError(requestError.response?.data?.detail || "No pudimos enviar el mensaje. Se conservará el texto para que puedas reintentar.");
    });
  };

  const updateMessage = async (messageId) => {
    if (messageBusy) return;
    setMessageBusy(true);
    setError("");
    try {
      const response = await api.patch(`/chat/${encodeURIComponent(room)}/${encodeURIComponent(messageId)}`, { body: editText });
      setMessages((prev) => prev.map((message) => message.id === messageId ? response.data : message));
      setEditingMessageId(null);
      setEditText("");
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "No pudimos editar el mensaje.");
    } finally {
      setMessageBusy(false);
    }
  };

  const removeMessage = async (messageId) => {
    if (messageBusy || !window.confirm("¿Eliminar este mensaje? El contenido y su adjunto se ocultarán del chat.")) return;
    setMessageBusy(true);
    setError("");
    try {
      const response = await api.delete(`/chat/${encodeURIComponent(room)}/${encodeURIComponent(messageId)}`);
      setMessages((prev) => prev.map((message) => message.id === messageId ? { ...message, body: "", file: null, deleted: true, deleted_at: response.data.deleted_at } : message));
      if (editingMessageId === messageId) setEditingMessageId(null);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "No pudimos eliminar el mensaje.");
    } finally {
      setMessageBusy(false);
    }
  };

  const filteredProfessors = professorContacts.filter((professor) =>
    `${professor.name} ${professor.program || ""}`.toLocaleLowerCase("es-CO").includes(contactQuery.toLocaleLowerCase("es-CO"))
  );

  const connectionLabel = connected
    ? "En línea"
    : connectionState === "polling"
      ? "Conectado · actualización cada 5 s"
    : connectionState === "connecting"
      ? "Conectando…"
      : connectionState === "retrying"
        ? "Sin conexión · reintentando"
        : connectionState === "unauthorized"
          ? "Sesión vencida"
          : connectionState === "forbidden"
            ? "Sin acceso a esta conversación"
            : "Chat no disponible";

  return (
    <section className="page chat-page" data-testid="chat-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">COORDINAR · EN COMUNIDAD</p>
          <h1>{isDirectRoom ? `Chat con ${directConversation?.other?.name || "docente"}` : `Chat de ${room === "general" ? "campus" : "asignatura"}`}</h1>
          <p className="lede">{isDirectRoom ? "Conversación privada entre tú y el docente." : "Conversa con tu grupo y recibe respuestas en tiempo real."}</p>
        </div>
        <span className={`live ${connected || connectionState === "polling" ? "on" : "off"}`} data-testid="chat-connection-state" aria-live="polite">
          {connected || connectionState === "polling" ? <Wifi size={14} /> : <WifiOff size={14} />}
          <i /> {connectionLabel}
        </span>
      </div>

      <div className="room-tabs" data-testid="chat-room-tabs">
        {user.role === "student" && (
          <button
            type="button"
            className={`tab direct-new ${directOpen ? "active" : ""}`}
            onClick={() => setDirectOpen((value) => !value)}
            aria-expanded={directOpen}
            aria-controls="professor-contact-panel"
            data-testid="open-direct-message-panel"
          >
            <UserRoundPlus size={14} aria-hidden="true" /> Escribir a un profesor
          </button>
        )}
        <button
          type="button"
          className={`tab ${room === "general" ? "active" : ""}`}
          onClick={() => nav("/chat/general")}
          data-testid="chat-room-general"
        >
          # Comunidad UAO
          {unread.rooms["general"] ? <em className="room-badge">{unread.rooms["general"]}</em> : null}
        </button>
        {subjects.map((s) => (
          <button
            type="button"
            key={s.id}
            className={`tab ${room === s.id ? "active" : ""}`}
            onClick={() => nav(`/chat/${s.id}`)}
            data-testid={`chat-room-${s.code}`}
          >
            # {s.name}
            {s.status === "closed" && <em className="room-badge room-closed-badge">Solo lectura</em>}
            {unread.rooms[s.id] ? <em className="room-badge">{unread.rooms[s.id]}</em> : null}
          </button>
        ))}
        {directConversations.map((conversation) => (
          <button
            type="button"
            key={conversation.room}
            className={`tab direct-room ${room === conversation.room ? "active" : ""}`}
            onClick={() => nav(`/chat/${encodeURIComponent(conversation.room)}`)}
            data-testid={`chat-direct-room-${conversation.room}`}
          >
            <MessageCircle size={13} aria-hidden="true" /> {conversation.other.name}
            {unread.rooms[conversation.room] ? <em className="room-badge">{unread.rooms[conversation.room]}</em> : null}
          </button>
        ))}
      </div>

      {directOpen && user.role === "student" && (
        <section className="direct-contact-panel" id="professor-contact-panel" aria-labelledby="direct-contact-heading" data-testid="professor-contact-panel">
          <div className="direct-contact-heading">
            <div><p className="eyebrow">MENSAJE PRIVADO</p><h2 id="direct-contact-heading">Elige un docente</h2></div>
            <p>Solo tú y el docente podrán leer este chat.</p>
          </div>
          <label className="direct-contact-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Buscar docente</span>
            <input value={contactQuery} onChange={(event) => setContactQuery(event.target.value)} placeholder="Buscar por nombre o programa" data-testid="direct-contact-search" />
          </label>
          {directFeatureError ? (
            <div className="error" role="alert" data-testid="direct-message-unavailable">{directFeatureError}</div>
          ) : filteredProfessors.length ? (
            <div className="direct-contact-list">
              {filteredProfessors.map((professor) => (
                <button type="button" key={professor.id} className="direct-contact" disabled={directLoading} onClick={() => startDirectConversation(professor)} data-testid={`direct-contact-${professor.id}`}>
                  <span className="avatar">{professor.name?.[0] || "D"}</span>
                  <span className="direct-contact-copy"><strong>{professor.name}</strong><small>{professor.program || "Docente UAO"}</small></span>
                  <MessageCircle size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <Empty text={professorContacts.length ? "No hay docentes con ese nombre." : "No hay docentes disponibles en el directorio."} />
          )}
        </section>
      )}

      {error && (
        <div className="error" data-testid="chat-error" onClick={() => setError("")}>
          {error}
        </div>
      )}

      <div className="chat-box">
        <div className="chat-head">
          <div className="avatar">{roomLabel[0]}</div>
          <div className="chat-head-info">
            <strong>{roomLabel}</strong>
            <span>
              {isDirectRoom ? <><MessageCircle size={13} /> Mensaje privado · {directConversation?.other?.role ? roleTag(directConversation.other.role) : "Docente"}</> : connectionState === "polling" ? <><Wifi size={13} /> Chat disponible · actualización cada 5 s</> : <><Users size={13} /> {presence.length} {presence.length === 1 ? "conectado" : "conectados"} · tiempo real</>}
            </span>
          </div>
          <div className="presence-list" data-testid="presence-list">
            {presence.slice(0, 6).map((p) => (
              <div className="presence-chip" key={p.id} data-testid={`presence-${p.id}`} title={`${p.name} · ${roleTag(p.role)}`}>
                <span className={`avatar mini role-${p.role}`}>{p.initial}</span>
                <div className="presence-meta">
                  <b>{p.name.split(" ")[0]}</b>
                  <small>{roleTag(p.role)}</small>
                </div>
              </div>
            ))}
            {presence.length > 6 && <span className="presence-more">+{presence.length - 6}</span>}
          </div>
        </div>
        <div className="messages" ref={messagesRef}>
          {messages.length ? (
            messages.map((m) => {
              if (m.system) return <div className="chat-system-message" key={m.id} role="status" data-testid={`chat-system-message-${m.id}`}>{m.body}</div>;
              const mine = user && m.user_id === user.id;
              const age = clockNow - new Date(m.created_at).getTime();
              const canEdit = mine && !m.deleted && Number.isFinite(age) && age >= 0 && age < 60_000 && !roomClosed;
              return (
                <div className={`message ${mine ? "mine" : ""}`} key={m.id} data-testid={`chat-message-${m.id}`}>
                  {!mine && <div className={`avatar mini role-${m.role || "student"}`}>{(m.author || "?")[0]}</div>}
                  <div className="msg-block">
                    <small>
                      {mine ? "Tú" : m.author}
                      {m.role ? ` · ${roleTag(m.role)}` : ""} ·{" "}
                      {new Date(m.created_at).toLocaleTimeString("es-CO", {
                        timeZone: "America/Bogota",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                    {!m.deleted && m.file && <MessageFile file={m.file} />}
                    {editingMessageId === m.id ? (
                      <form className="message-edit-form" onSubmit={(event) => { event.preventDefault(); updateMessage(m.id); }}>
                        <textarea aria-label="Editar mensaje" value={editText} onChange={(event) => setEditText(event.target.value)} maxLength={2000} autoFocus data-testid={`edit-message-input-${m.id}`} />
                        <div><button type="submit" className="message-edit-save" disabled={messageBusy || (!editText.trim() && !m.file)}><Check size={14} /> Guardar</button><button type="button" className="message-edit-cancel" onClick={() => { setEditingMessageId(null); setEditText(""); }} disabled={messageBusy}>Cancelar</button></div>
                      </form>
                    ) : m.deleted ? <p className="message-deleted">Mensaje eliminado</p> : (
                      <>
                        {m.body && <p>{m.body}</p>}
                        {m.edited_at && <p className="message-edited-label" data-testid={`message-edited-${m.id}`}>Mensaje editado</p>}
                      </>
                    )}
                    {canEdit && editingMessageId !== m.id && (
                      <div className="message-actions" aria-label="Acciones de tu mensaje">
                        <button type="button" onClick={() => { setEditingMessageId(m.id); setEditText(m.body || ""); }} disabled={messageBusy} title="Editar durante el primer minuto" data-testid={`edit-message-${m.id}`}><Pencil size={13} aria-hidden="true" /> Editar</button>
                        <button type="button" onClick={() => removeMessage(m.id)} disabled={messageBusy} title="Eliminar durante el primer minuto" data-testid={`delete-message-${m.id}`}><Trash2 size={13} aria-hidden="true" /> Eliminar</button>
                        <span>Disponible {Math.max(1, Math.ceil((60_000 - age) / 1000))} s</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <Empty text={isDirectRoom ? "Envía el primer mensaje privado a este docente." : "Sé la primera persona en saludar"} />
          )}
        </div>
        {roomClosed && <div className="chat-room-closed" role="status" data-testid="chat-room-closed">Esta asignatura está cerrada. El chat se conserva en modo de solo lectura.</div>}
        <AttachmentPreview file={attachment} onClear={() => setAttachment(null)} />
        <form className="chat-compose" onSubmit={send}>
          <input
            type="file"
            accept="image/*,application/pdf"
            ref={fileInputRef}
            onChange={onFileChosen}
            style={{ display: "none" }}
            data-testid="chat-file-input"
          />
          <button
            type="button"
            onClick={openFilePicker}
            disabled={uploading || roomClosed}
            data-testid="attach-chat-file"
            aria-label="Adjuntar archivo"
          >
            <Paperclip size={18} />
          </button>
          <input
            data-testid="chat-message-input"
            placeholder={roomClosed ? "Asignatura cerrada · solo lectura" : uploading ? "Subiendo archivo…" : "Escribe un mensaje…"}
            value={body}
            disabled={uploading || roomClosed}
            onChange={(e) => setBody(e.target.value)}
          />
          <button className="send" data-testid="send-chat-message" aria-label="Enviar mensaje" disabled={uploading || roomClosed || (!body.trim() && !attachment)}>
            <Send size={17} />
          </button>
        </form>
      </div>
    </section>
  );
}
