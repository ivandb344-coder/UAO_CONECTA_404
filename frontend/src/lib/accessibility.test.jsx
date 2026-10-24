jest.mock("@/lib/api", () => ({ api: { patch: jest.fn() } }), { virtual: true });

const { applyAccessibility, DEFAULT_ACCESSIBILITY } = require("./accessibility");

describe("applyAccessibility", () => {
  afterEach(() => {
    applyAccessibility(DEFAULT_ACCESSIBILITY);
  });

  it("applies and clears the high-contrast class and related preferences", () => {
    applyAccessibility({
      ...DEFAULT_ACCESSIBILITY,
      contrast: "high",
      text_size: "large",
      animations: false,
      reduced_motion: true,
      focus_visible: true,
      large_controls: true,
    });

    const root = document.documentElement;
    expect(root.classList.contains("a11y-high-contrast")).toBe(true);
    expect(root.classList.contains("a11y-no-anim")).toBe(true);
    expect(root.classList.contains("a11y-reduced-motion")).toBe(true);
    expect(root.classList.contains("a11y-focus")).toBe(true);
    expect(root.classList.contains("a11y-large")).toBe(true);
    expect(root.dataset.textSize).toBe("large");

    applyAccessibility(DEFAULT_ACCESSIBILITY);
    expect(root.classList.contains("a11y-high-contrast")).toBe(false);
    expect(root.classList.contains("a11y-no-anim")).toBe(false);
    expect(root.dataset.textSize).toBe("normal");
  });
});
