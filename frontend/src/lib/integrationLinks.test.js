import { DEFAULT_LINKS, LINKS_KEY, loadLinks, normalizeExternalUrl, saveLinks } from "./integrationLinks";

describe("integrationLinks sync & validation", () => {
  afterEach(() => {
    localStorage.removeItem(LINKS_KEY);
  });

  it("emits uao:links-updated and persists custom URLs on saveLinks", () => {
    const listener = jest.fn();
    window.addEventListener("uao:links-updated", listener);
    try {
      const next = { ...DEFAULT_LINKS, moodle: "https://campus.uaovirtual.edu.co/course/view.php?id=99" };
      saveLinks(next);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(loadLinks().moodle).toBe("https://campus.uaovirtual.edu.co/course/view.php?id=99");
    } finally {
      window.removeEventListener("uao:links-updated", listener);
    }
  });

  it("blocks javascript: and non-http schemes when normalizing external URLs", () => {
    expect(normalizeExternalUrl("javascript:alert(1)")).toBe("");
    expect(normalizeExternalUrl("javascript:alert(1)", DEFAULT_LINKS.support)).toBe(DEFAULT_LINKS.support);
    expect(normalizeExternalUrl("meet.google.com/abc-defg-hij")).toBe("https://meet.google.com/abc-defg-hij");
  });
});
