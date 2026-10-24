import React, { act } from "react";
import { createRoot } from "react-dom/client";
import HoverDisclosureCard from "./HoverDisclosureCard";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("HoverDisclosureCard", () => {
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
    document.documentElement.classList.remove("a11y-no-anim", "a11y-reduced-motion");
  });

  it("opens only the hovered card and still opens when animations are disabled", () => {
    act(() => root.render(
      <>
        <HoverDisclosureCard className="card" detailsClassName="details" panelId="one-panel" label="Descripción" panel={<p>Uno</p>} />
        <HoverDisclosureCard className="card" detailsClassName="details" panelId="two-panel" label="Descripción" panel={<p>Dos</p>} />
      </>
    ));

    const cards = container.querySelectorAll("article");
    const disclosures = container.querySelectorAll("details");
    expect(disclosures[0].open).toBe(false);
    expect(disclosures[1].open).toBe(false);

    document.documentElement.classList.add("a11y-no-anim");
    act(() => cards[0].dispatchEvent(new MouseEvent("mouseover", { bubbles: true, relatedTarget: document.body })));

    expect(disclosures[0].open).toBe(true);
    expect(disclosures[0].querySelector("[aria-hidden='false']")).not.toBeNull();
    expect(disclosures[1].open).toBe(false);

    act(() => cards[0].dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body })));
    expect(disclosures[0].open).toBe(false);
  });
});
