import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Paperclip, Send, Users, Wifi, WifiOff } from "lucide-react";
import { api, API } from "@/lib/api";
import { Empty } from "@/components/ui/states";

const WS_BASE = API.replace(/^http/, "ws");

export default function Chat({ user }) {
  const { room: routeRoom } = useParams();
  const nav = useNavigate();
  const room = routeRoom || "general";
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState(1);
  const [subjects, setSubjects] = useState([]);
  const wsRef = useRef(null);
  const messagesRef = useRef(null);
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
            setPresence(payload.size || 1);
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

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ body: text }));
      setBody("");
    } else {
      // Fallback to HTTP (broadcasts to open sockets too)
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
        </button>
        {subjects.map((s) => (
          <button
            key={s.id}
            className={`tab ${room === s.id ? "active" : ""}`}
            onClick={() => nav(`/chat/${s.id}`)}
            data-testid={`chat-room-${s.code}`}
          >
            # {s.name}
          </button>
        ))}
      </div>

      <div className="chat-box">
        <div className="chat-head">
          <div className="avatar">{roomLabel[0]}</div>
          <div>
            <strong>{roomLabel}</strong>
            <span>
              <Users size={13} /> {presence} {presence === 1 ? "conectado" : "conectados"} · realtime
            </span>
          </div>
        </div>
        <div className="messages" ref={messagesRef}>
          {messages.length ? (
            messages.map((m) => {
              const mine = user && m.user_id === user.id;
              return (
                <div className={`message ${mine ? "mine" : ""}`} key={m.id} data-testid={`chat-message-${m.id}`}>
                  {!mine && <div className="avatar mini">{(m.author || "?")[0]}</div>}
                  <div>
                    <small>
                      {mine ? "Tú" : m.author} ·{" "}
                      {new Date(m.created_at).toLocaleTimeString("es-CO", {
                        timeZone: "America/Bogota",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                    <p>{m.body}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <Empty text="Sé la primera persona en saludar" />
          )}
        </div>
        <form className="chat-compose" onSubmit={send}>
          <button type="button" data-testid="attach-chat-file">
            <Paperclip size={18} />
          </button>
          <input
            data-testid="chat-message-input"
            placeholder="Escribe un mensaje…"
            value={body}
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
