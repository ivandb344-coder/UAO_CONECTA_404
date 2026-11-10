import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { useViewMode, ViewModeProvider } from "./viewMode";
import MonitorToggle from "../components/hub/MonitorToggle";

jest.mock("./api", () => ({ api: { patch: jest.fn(() => Promise.resolve({ data: { enabled: true } })) } }));
import { api } from "./api";

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
    api.patch.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
  });

  it("enables peer support after confirmation while preserving the student account role", async () => {
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
    expect(container.querySelector("[data-testid='monitor-mode-confirmation']")).not.toBeNull();
    const enableButton = [...container.querySelectorAll("button")].find((button) => button.textContent.includes("Activar modo Monitor"));
    await act(async () => {
      enableButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.querySelector("[data-testid='view-role']").textContent).toBe("monitor");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(api.patch).toHaveBeenCalledWith("/auth/peer-monitor-mode", { enabled: true });

    await act(async () => {
      toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.querySelector("[data-testid='view-role']").textContent).toBe("student");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(api.patch).toHaveBeenCalledTimes(1);
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
