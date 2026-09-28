import { useEffect, useState } from "react";
import { Paperclip, Send, Users } from "lucide-react";
import { api } from "@/lib/api";
import { Empty } from "@/components/ui/states";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");

  const load = () => api.get("/chat/general").then((r) => setMessages(r.data));

  useEffect(() => {
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, []);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    await api.post("/chat", { body, room: "general" });
    setBody("");
    load();
  };

  return (
    <section className="page chat-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">COORDINAR · EN COMUNIDAD</p>
          <h1>Chat de campus</h1>
          <p className="lede">Conversa con tu grupo y encuentra apoyo.</p>
        </div>
        <span className="live">
          <i /> Actualizado en vivo
        </span>
      </div>
      <div className="chat-box">
        <div className="chat-head">
          <div className="avatar">G</div>
          <div>
            <strong>Comunidad UAO</strong>
            <span>
              <Users size={13} /> 128 participantes
            </span>
          </div>
        </div>
        <div className="messages">
          {messages.length ? (
            messages.map((m) => (
              <div className="message" key={m.id}>
                <div className="avatar mini">{m.author[0]}</div>
                <div>
                  <small>
                    {m.author} ·{" "}
                    {new Date(m.created_at).toLocaleTimeString("es-CO", {
                      timeZone: "America/Bogota",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                  <p>{m.body}</p>
                </div>
              </div>
            ))
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
          <button className="send" data-testid="send-chat-message">
            <Send size={17} />
          </button>
        </form>
      </div>
    </section>
  );
}
