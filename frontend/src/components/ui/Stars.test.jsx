import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { StarsDisplay, StarsInput } from "./Stars";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("Stars accessibility and selection", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders accessible star buttons with aria-pressed and invokes onChange", () => {
    const onChange = jest.fn();
    act(() => root.render(<StarsInput value={3} onChange={onChange} />));

    const group = container.querySelector('[role="group"][aria-label="Valoración en estrellas"]');
    expect(group).not.toBeNull();

    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(5);
    expect(buttons[0].getAttribute("aria-label")).toBe("Calificar con 1 estrella");
    expect(buttons[2].getAttribute("aria-pressed")).toBe("true");
    expect(buttons[4].getAttribute("aria-label")).toBe("Calificar con 5 estrellas");
    expect(buttons[4].getAttribute("aria-pressed")).toBe("false");

    act(() => buttons[4].click());
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("formats average rating safely even when value is null or undefined", () => {
    act(() => root.render(<StarsDisplay value={null} count={0} />));
    expect(container.querySelector("b").textContent).toBe("0.0");
    expect(container.querySelector("em").textContent).toBe("0 valoraciones");
  });
});
