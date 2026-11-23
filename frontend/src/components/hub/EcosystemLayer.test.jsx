import React, { act } from "react";
import { createRoot } from "react-dom/client";
import EcosystemLayer from "./EcosystemLayer";
import { LINKS_KEY } from "../../lib/integrationLinks";

jest.mock("../../lib/viewMode", () => ({
  useViewMode: () => ({ viewRole: "professor" }),
}));

jest.mock("../../lib/audioFeedback", () => ({
  playUiSound: jest.fn(),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("EcosystemLayer edit links feedback", () => {
  let container;
  let root;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.removeItem(LINKS_KEY);
    jest.useRealTimers();
  });

  it("shows a save-toast confirmation when edited links are saved", () => {
    act(() => root.render(<EcosystemLayer />));

    expect(container.querySelector('[data-testid="links-save-toast"]')).toBeNull();

    act(() => {
      container.querySelector('[data-testid="integration-edit-links"]').click();
    });

    const form = container.querySelector('[data-testid="edit-links-form"]');
    expect(form).not.toBeNull();

    act(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    const toast = container.querySelector('[data-testid="links-save-toast"]');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toContain("Cambios guardados");

    act(() => {
      jest.advanceTimersByTime(3600);
    });
    expect(container.querySelector('[data-testid="links-save-toast"]')).toBeNull();
  });
});
