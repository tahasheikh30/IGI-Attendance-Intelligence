import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import SelectMenu from "../components/SelectMenu";

const css = fs.readFileSync(path.resolve(__dirname, "../styles.css"), "utf8");
const OPTIONS = [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }, { value: "c", label: "Gamma" }];
const setup = (props = {}) => {
  const onChange = vi.fn();
  render(<SelectMenu ariaLabel="Letter" value="a" options={OPTIONS} onChange={onChange} {...props} />);
  return { onChange, trigger: screen.getByRole("button", { name: "Letter" }) };
};

describe("SelectMenu", () => {
  it("shows the chosen option and is closed at first", () => {
    const { trigger } = setup({ value: "b" });
    expect(trigger).toHaveTextContent("Beta");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
  it("opens a list of every option with the current one marked", () => {
    const { trigger } = setup({ value: "b" });
    fireEvent.click(trigger);
    const opts = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(opts.map((o) => o.textContent)).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(opts[1]).toHaveAttribute("aria-selected", "true");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
  it("choosing an option reports its value and closes", () => {
    const { trigger, onChange } = setup();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "Gamma" }));
    expect(onChange).toHaveBeenCalledWith("c");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
  it("choosing the current option changes nothing", () => {
    const { trigger, onChange } = setup();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "Alpha" }));
    expect(onChange).not.toHaveBeenCalled();
  });
  it("works from the keyboard: arrows move, Enter picks, Escape closes", () => {
    const { trigger, onChange } = setup();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // stops at the last one
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("c");
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it("a click outside closes it without choosing", () => {
    const { trigger, onChange } = setup();
    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
  it("is drawn with the app's colours, not left to the browser", () => {
    expect(css).toMatch(/\.select-menu-list \{[^}]*background:\s*var\(--surface\)/);
    expect(css).toMatch(/\.select-menu-trigger \{[^}]*border-radius:\s*10px/);
    expect(css).toMatch(/\.select-menu-option\.is-selected \{[^}]*var\(--accent-light\)/);
  });
});
