import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import LoadingDots from "../components/LoadingDots";

describe("LoadingDots", () => {
  it("shows the default words and announces them politely", () => {
    render(<LoadingDots />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    const box = screen.getByRole("status");
    expect(box).toHaveAttribute("aria-live", "polite");
  });

  it("takes a custom label", () => {
    render(<LoadingDots label="Loading accounts…" />);
    expect(screen.getByText("Loading accounts…")).toBeInTheDocument();
  });

  it("hides the three dots from screen readers and uses no inline style", () => {
    const { container } = render(<LoadingDots />);
    const track = container.querySelector(".loading-dots-track");
    expect(track).toHaveAttribute("aria-hidden", "true");
    expect(track.querySelectorAll("i")).toHaveLength(3);
    expect(container.querySelector("[style]")).toBeNull();
  });

  it("has a page variant that sits in the middle of the screen", () => {
    const { container } = render(<LoadingDots page />);
    expect(container.querySelector(".loading-dots-page")).not.toBeNull();
    const css = fs.readFileSync(path.resolve(__dirname, "../styles.css"), "utf8");
    expect(css).toMatch(/\.loading-dots-page \{[^}]*position: fixed;[^}]*justify-content: center;[^}]*pointer-events: none;/);
  });

  it("has an inline variant", () => {
    const { container } = render(<LoadingDots inline />);
    expect(container.querySelector(".loading-dots-inline")).not.toBeNull();
  });

  it("turns the movement off for people who ask for reduced motion", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../styles.css"), "utf8");
    const block = css.slice(css.indexOf("prefers-reduced-motion: reduce) {\n  .loading-dots-track"));
    for (const dot of ["dot-a", "dot-b", "dot-c"]) expect(block).toContain(`.loading-dots-track .${dot}`);
    expect(block).toMatch(/animation: none/);
  });
});
