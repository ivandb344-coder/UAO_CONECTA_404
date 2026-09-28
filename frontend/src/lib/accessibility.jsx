import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

export const DEFAULT_ACCESSIBILITY = {
  contrast: "normal",
  text_size: "normal",
  animations: true,
  reduced_motion: false,
  focus_visible: false,
  large_controls: false,
};

const STORAGE_KEY = "uao_a11y";
const AccessibilityContext = createContext({ prefs: DEFAULT_ACCESSIBILITY, update: () => {}, saving: false, saveError: "" });

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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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
      const next = { ...prefs, ...patch };
      setPrefs(next);
      if (!user) return;
      setSaving(true);
      setSaveError("");
      try {
        await api.patch("/profile/preferences", patch);
      } catch {
        setSaveError("No pudimos guardar tus preferencias en tu cuenta. Se mantienen en este dispositivo.");
      } finally {
        setSaving(false);
      }
    },
    [prefs, user],
  );

  const value = useMemo(() => ({ prefs, update, saving, saveError }), [prefs, update, saving, saveError]);
  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export const useAccessibility = () => useContext(AccessibilityContext);
