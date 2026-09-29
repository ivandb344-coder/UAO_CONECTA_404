import { useState } from "react";
import { Bot, Send } from "lucide-react";
import { API } from "@/lib/api";

export default function AI() {
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "Hola, soy el asistente de UAO Conecta. ¿Qué necesitas encontrar hoy?",
    },
  ]);

  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async (e) => {
    e.preventDefault();

    const question = value.trim();

    if (!question || loading) {
      return;
    }

    setValue("");

    setMessages((messages) => [
      ...messages,
      {
        from: "user",
        text: question,
      },
    ]);

    setLoading(true);

    try {
      const token = localStorage.getItem("uao_token");

      if (!token) {
        throw new Error(
          "Tu sesión no está disponible. Inicia sesión nuevamente."
        );
      }

      const res = await fetch(`${API}/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: question,
        }),
      });

      const contentType =
        res.headers.get("content-type") || "";

      if (!res.ok) {
        let errorMessage =
          "No pude comunicarme con el asistente de IA.";

        if (contentType.includes("application/json")) {
          const data = await res.json();

          if (typeof data?.detail === "string") {
            errorMessage = data.detail;
          }
        } else {
          const text = await res.text();

          if (text.trim()) {
            errorMessage = text;
          }
        }

        throw new Error(errorMessage);
      }

      const text = await res.text();

      setMessages((messages) => [
        ...messages,
        {
          from: "ai",
          text:
            text.trim() ||
            "No recibí una respuesta del asistente.",
        },
      ]);
    } catch (error) {
      setMessages((messages) => [
        ...messages,
        {
          from: "ai",
          text:
            error.message ||
            "No pude conectarme con el asistente. Intenta nuevamente.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page ai-page">
      <div className="ai-hero">
        <div className="ai-orbit big">
          <Bot size={34} />
        </div>

        <p className="eyebrow">
          ASISTENTE UAO CONECTA
        </p>

        <h1>
          Pregúntame lo que
          <br />
          <em>necesites saber.</em>
        </h1>

        <p>
          Te ayudo a orientarte entre asignaturas,
          tareas, recursos y personas. Si no tengo
          certeza, te lo diré.
        </p>
      </div>

      <div
        className="ai-chat"
        data-testid="ai-chat"
      >
        <div className="ai-messages">
          {messages.map((m, i) => (
            <div
              className={`ai-message ${m.from}`}
              key={i}
            >
              <div className="ai-bubble">
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div
              className="typing"
              data-testid="ai-loading"
            >
              Escribiendo…
            </div>
          )}
        </div>

        <form
          onSubmit={ask}
          className="ai-compose"
        >
          <input
            data-testid="ai-message-input"
            placeholder="Ej. ¿Dónde encuentro asesorías de Cálculo?"
            value={value}
            onChange={(e) =>
              setValue(e.target.value)
            }
            disabled={loading}
          />

          <button
            type="submit"
            className="send"
            data-testid="send-ai-message"
            disabled={loading || !value.trim()}
          >
            <Send size={17} />
          </button>
        </form>
      </div>
    </section>
  );
}