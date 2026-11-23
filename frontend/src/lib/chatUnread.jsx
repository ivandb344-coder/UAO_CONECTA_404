import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

const ChatUnreadContext = createContext({ total: 0, rooms: {}, refresh: () => {}, markRead: () => {} });

export function ChatUnreadProvider({ enabled, children }) {
  const [state, setState] = useState({ total: 0, rooms: {} });

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const r = await api.get("/chat/summary");
      setState({ total: r.data.total || 0, rooms: r.data.rooms || {} });
    } catch {
      /* ignore */
    }
  }, [enabled]);

  const markRead = useCallback((room) => {
    if (!room) return;
    setState((prev) => {
      if (!prev.rooms[room]) return prev;
      const rooms = { ...prev.rooms };
      const drop = rooms[room] || 0;
      delete rooms[room];
      return { total: Math.max(0, prev.total - drop), rooms };
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState({ total: 0, rooms: {} });
      return undefined;
    }
    refresh();
    const tick = () => {
      if (document.visibilityState !== "hidden") refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const i = setInterval(tick, 15000);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(i);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, refresh]);

  const value = useMemo(() => ({ ...state, refresh, markRead }), [state, refresh, markRead]);
  return <ChatUnreadContext.Provider value={value}>{children}</ChatUnreadContext.Provider>;
}

export const useChatUnread = () => useContext(ChatUnreadContext);
