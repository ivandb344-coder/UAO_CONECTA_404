import { useState } from "react";
import { Bot, Send } from "lucide-react";
import { API } from "@/lib/api";

export default function AI() {
  const [messages, setMessages] = useState([
    { from: "ai", text: "Hola, soy el asistente de UAO Conecta. ¿Qué necesitas encontrar hoy?" },
  ]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    const q = value;
    setValue("");
    setMessages((m) => [...m, { from: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("uao_token")}`,
        },
        body: JSON.stringify({ message: q }),
      });
      const text = await res.text();
      setMessages((m) => [...m, { from: "ai", text }]);
    } catch {
      setMessages((m) => [...m, { from: "ai", text: "No pude conectarme ahora. Intenta de nuevo en un momento." }]);
    }
    setLoading(false);
  };

  return (
    <section className="page ai-page">
      <div className="ai-hero">
        <div className="ai-orbit big">
          <Bot size={34} />
        </div>
        <p className="eyebrow">ASISTENTE UAO CONECTA</p>
        <h1>
          Pregúntame lo que
          <br />
          <em>necesites saber.</em>
        </h1>
        <p>
          Te ayudo a orientarte entre asignaturas, tareas, recursos y personas. Si no tengo certeza, te lo diré.
        </p>
      </div>
      <div className="ai-chat" data-testid="ai-chat">
        <div className="ai-messages">
          {messages.map((m, i) => (
            <div className={`ai-message ${m.from}`} key={i}>
              <div className="ai-bubble">{m.text}</div>
            </div>
          ))}
          {loading && (
            <div className="typing" data-testid="ai-loading">
              Escribiendo…
            </div>
          )}
        </div>
        <form onSubmit={ask} className="ai-compose">
          <input
            data-testid="ai-message-input"
            placeholder="Ej. ¿Dónde encuentro asesorías de Cálculo?"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button className="send" data-testid="send-ai-message">
            <Send size={17} />
          </button>
        </form>
      </div>
    </section>
  );
}
