import { describe, it, expect, beforeEach } from "vitest";
import { applyRememberedTheme, applyTheme, getRememberedTheme } from "../lib/theme";

beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset.theme; });

describe("theme memory", () => {
  it("applies and remembers a theme", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(getRememberedTheme()).toBe("dark");
  });
  it("a new visit starts in the remembered theme", () => {
    localStorage.setItem("attendance_theme", "dark");
    applyRememberedTheme();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
  it("ignores anything that is not a known theme", () => {
    localStorage.setItem("attendance_theme", "<script>");
    applyRememberedTheme();
    expect(document.documentElement.dataset.theme).toBeUndefined();
    applyTheme("sepia");
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
  it("still works when storage is blocked", () => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error("blocked"); };
    try { applyTheme("dark"); } finally { Storage.prototype.setItem = real; }
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
