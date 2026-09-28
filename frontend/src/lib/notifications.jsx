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
      try {
        await api.post(`/notifications/${id}/read`);
      } catch {
        /* ignore */
      }
      refresh();
    },
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    try {
      await api.post("/notifications/read-all");
    } catch {
      /* ignore */
    }
    refresh();
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
