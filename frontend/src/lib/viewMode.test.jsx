import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { useViewMode, ViewModeProvider } from "./viewMode";
import MonitorToggle from "../components/hub/MonitorToggle";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function ViewRoleLabel() {
  const { viewRole } = useViewMode();
  return <output data-testid="view-role">{viewRole}</output>;
}

describe("role views", () => {
  let container;
  let root;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
  });

  it("switches the student dashboard to the monitor view and back", () => {
    act(() => root.render(
      <ViewModeProvider user={{ id: "student-1", role: "student" }}>
        <MonitorToggle />
        <ViewRoleLabel />
      </ViewModeProvider>
    ));

    expect(container.querySelector("[data-testid='view-role']").textContent).toBe("student");
    const toggle = container.querySelector("[data-testid='monitor-mode-toggle']");
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    act(() => toggle.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container.querySelector("[data-testid='view-role']").textContent).toBe("monitor");
    expect(toggle.getAttribute("aria-checked")).toBe("true");

    act(() => toggle.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container.querySelector("[data-testid='view-role']").textContent).toBe("student");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("keeps the monitor control hidden for professors", () => {
    act(() => root.render(
      <ViewModeProvider user={{ id: "professor-1", role: "professor" }}>
        <MonitorToggle />
        <ViewRoleLabel />
      </ViewModeProvider>
    ));

    expect(container.querySelector("[data-testid='view-role']").textContent).toBe("professor");
    expect(container.querySelector("[data-testid='monitor-mode-toggle']")).toBeNull();
  });
});
