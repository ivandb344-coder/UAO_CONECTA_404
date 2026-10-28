import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

export const DEFAULT_ACCESSIBILITY = {
  contrast: "normal",
  text_size: "normal",
  animations: true,
  reduced_motion: false,
  focus_visible: false,
  large_controls: false,
  sound_effects: false,
  spoken_labels: false,
};

const STORAGE_KEY = "uao_a11y";
const AccessibilityContext = createContext({ prefs: DEFAULT_ACCESSIBILITY, update: async () => true, saving: false, saveError: "" });

function readCached() {
  try {
    return { ...DEFAULT_ACCESSIBILITY, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {}) };
  } catch {
    return DEFAULT_ACCESSIBILITY;
  }
}

export function applyAccessibility(prefs) {
  const root = document.documentElement;
  root.classList.toggle("a11y-high-contrast", prefs.contrast === "high");
  root.classList.toggle("a11y-no-anim", !prefs.animations);
  root.classList.toggle("a11y-reduced-motion", !!prefs.reduced_motion);
  root.classList.toggle("a11y-focus", !!prefs.focus_visible);
  root.classList.toggle("a11y-large", !!prefs.large_controls);
  root.dataset.textSize = prefs.text_size || "normal";
}

export function AccessibilityProvider({ user, children }) {
  const [prefs, setPrefs] = useState(readCached);
  const [pendingSaves, setPendingSaves] = useState(0);
  const [saveError, setSaveError] = useState("");
  const saving = pendingSaves > 0;

  useEffect(() => {
    if (user?.preferences?.accessibility) {
      setPrefs({ ...DEFAULT_ACCESSIBILITY, ...user.preferences.accessibility });
    }
  }, [user?.id, user?.preferences?.accessibility]);

  useEffect(() => {
    applyAccessibility(prefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const update = useCallback(
    async (patch) => {
      setPrefs((current) => ({ ...current, ...patch }));
      if (!user) return true;
      setPendingSaves((current) => current + 1);
      setSaveError("");
      try {
        await api.patch("/profile/preferences", patch);
        return true;
      } catch {
        setSaveError("No pudimos guardar tus preferencias en tu cuenta. Se mantienen en este dispositivo.");
        return false;
      } finally {
        setPendingSaves((current) => Math.max(0, current - 1));
      }
    },
    [user],
  );

  const value = useMemo(() => ({ prefs, update, saving, saveError }), [prefs, update, saving, saveError]);
  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export const useAccessibility = () => useContext(AccessibilityContext);
