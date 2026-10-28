import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

const NotificationsContext = createContext({
  unread: 0,
  items: [],
  refresh: () => {},
  markRead: () => {},
  markAllRead: () => {},
});

export function NotificationsProvider({ enabled, children }) {
  const [state, setState] = useState({ unread: 0, items: [] });

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const r = await api.get("/notifications");
      setState({ unread: r.data.unread || 0, items: r.data.items || [] });
    } catch {
      /* ignore */
    }
  }, [enabled]);

  const markRead = useCallback(
    async (id) => {
      setState((previous) => {
        const item = previous.items.find((entry) => entry.id === id);
        if (!item || item.read) return previous;
        return {
          unread: Math.max(0, previous.unread - 1),
          items: previous.items.map((entry) => entry.id === id ? { ...entry, read: true } : entry),
        };
      });
      try {
        await api.post(`/notifications/${encodeURIComponent(id)}/read`);
      } catch {
        await refresh();
        return;
      }
      await refresh();
    },
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    setState((previous) => ({ unread: 0, items: previous.items.map((item) => ({ ...item, read: true })) }));
    try {
      await api.post("/notifications/read-all");
    } catch {
      await refresh();
      return;
    }
    await refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const i = setInterval(refresh, 20000);
    return () => clearInterval(i);
  }, [enabled, refresh]);

  const value = useMemo(() => ({ ...state, refresh, markRead, markAllRead }), [state, refresh, markRead, markAllRead]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export const useNotifications = () => useContext(NotificationsContext);
