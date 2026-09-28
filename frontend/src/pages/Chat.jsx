import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Paperclip, Send, Users, Wifi, WifiOff, FileText, X as XIcon } from "lucide-react";
import { api, API } from "@/lib/api";
import { Empty } from "@/components/ui/states";
import { useChatUnread } from "@/lib/chatUnread";

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
  if (!file) return null;
  const src = `${API}/files/${file.storage_path}`;
  const isImage = (file.content_type || "").startsWith("image/");
  if (isImage) {
    return (
      <a href={src} target="_blank" rel="noreferrer" className="message-image">
        <img src={src} alt={file.name} loading="lazy" />
      </a>
    );
  }
  return (
    <a href={src} target="_blank" rel="noreferrer" className="message-file">
      <FileText size={14} /> {file.name}
    </a>
  );
}

export default function Chat({ user }) {
  const { room: routeRoom } = useParams();
  const nav = useNavigate();
  const room = routeRoom || "general";
  const unread = useChatUnread();
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [attachment, setAttachment] = useState(null); // {name, storage_path, content_type, size}
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const wsRef = useRef(null);
  const messagesRef = useRef(null);
  const fileInputRef = useRef(null);
  const retryRef = useRef(0);

  const roomLabel = useMemo(() => {
    if (room === "general") return "Comunidad UAO";
    const s = subjects.find((x) => x.id === room);
    return s ? s.name : "Sala";
  }, [room, subjects]);

  useEffect(() => {
    api.get("/subjects").then((r) => setSubjects(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    api
      .get(`/chat/${room}`)
      .then((r) => {
        if (!cancelled) setMessages(r.data);
      })
      .catch(() => {});

    const openSocket = () => {
      const token = localStorage.getItem("uao_token");
      if (!token) return;
      const ws = new WebSocket(`${WS_BASE}/ws/chat/${room}?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;
      ws.onopen = () => {
        setConnected(true);
        retryRef.current = 0;
      };
      ws.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload.type === "message") {
            setMessages((prev) =>
              prev.some((m) => m.id === payload.message.id) ? prev : [...prev, payload.message]
            );
          } else if (payload.type === "presence") {
            setPresence(payload.users || []);
          }
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!cancelled) {
          retryRef.current += 1;
          const wait = Math.min(1000 * retryRef.current, 6000);
          setTimeout(() => {
            if (!cancelled) openSocket();
          }, wait);
        }
      };
      ws.onerror = () => {
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
      try {
        wsRef.current?.close();
      } catch {
        /* ignore */
      }
    };
  }, [room]);

  // Mark room as seen when we open it and every time a new message arrives while we're here
  useEffect(() => {
    if (!room) return;
    const ping = () => {
      api.post(`/chat/${room}/seen`).catch(() => {});
      unread.markRead(room);
    };
    ping();
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, messages.length]);

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
      ws.send(JSON.stringify(payload));
      setBody("");
      setAttachment(null);
    } else {
      // fallback HTTP (no file support on this path in v1)
      api.post("/chat", { body: text, room }).then((r) => {
        setMessages((prev) => (prev.some((m) => m.id === r.data.id) ? prev : [...prev, r.data]));
        setBody("");
      });
    }
  };

  return (
    <section className="page chat-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">COORDINAR · EN COMUNIDAD</p>
          <h1>Chat de {room === "general" ? "campus" : "asignatura"}</h1>
          <p className="lede">Conversa con tu grupo y recibe respuestas en tiempo real.</p>
        </div>
        <span className={`live ${connected ? "on" : "off"}`} data-testid="chat-connection-state">
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          <i /> {connected ? "En línea" : "Reconectando…"}
        </span>
      </div>

      <div className="room-tabs" data-testid="chat-room-tabs">
        <button
          className={`tab ${room === "general" ? "active" : ""}`}
          onClick={() => nav("/chat/general")}
          data-testid="chat-room-general"
        >
          # Comunidad UAO
          {unread.rooms["general"] ? <em className="room-badge">{unread.rooms["general"]}</em> : null}
        </button>
        {subjects.map((s) => (
          <button
            key={s.id}
            className={`tab ${room === s.id ? "active" : ""}`}
            onClick={() => nav(`/chat/${s.id}`)}
            data-testid={`chat-room-${s.code}`}
          >
            # {s.name}
            {unread.rooms[s.id] ? <em className="room-badge">{unread.rooms[s.id]}</em> : null}
          </button>
        ))}
      </div>

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
              <Users size={13} /> {presence.length || 1} {presence.length === 1 ? "conectado" : "conectados"} · realtime
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
              const mine = user && m.user_id === user.id;
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
                    {m.file && <MessageFile file={m.file} />}
                    {m.body && <p>{m.body}</p>}
                  </div>
                </div>
              );
            })
          ) : (
            <Empty text="Sé la primera persona en saludar" />
          )}
        </div>
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
            disabled={uploading}
            data-testid="attach-chat-file"
            aria-label="Adjuntar archivo"
          >
            <Paperclip size={18} />
          </button>
          <input
            data-testid="chat-message-input"
            placeholder={uploading ? "Subiendo archivo…" : "Escribe un mensaje…"}
            value={body}
            disabled={uploading}
            onChange={(e) => setBody(e.target.value)}
          />
          <button className="send" data-testid="send-chat-message" aria-label="Enviar mensaje">
            <Send size={17} />
          </button>
        </form>
      </div>
    </section>
  );
}
