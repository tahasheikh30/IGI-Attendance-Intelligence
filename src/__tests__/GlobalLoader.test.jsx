import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import GlobalLoader from "../components/GlobalLoader";
import { beginActivity, isBusy } from "../lib/activity";
import api, { getDataStatus, searchEmployees, getCompanies } from "../api";

const css = fs.readFileSync(path.resolve(__dirname, "../styles.css"), "utf8");

describe("GlobalLoader", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows nothing when nothing is loading", () => {
    render(<GlobalLoader />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("does not flash for quick requests", () => {
    render(<GlobalLoader />);
    let end;
    act(() => { end = beginActivity(); });
    act(() => vi.advanceTimersByTime(200));
    act(() => end());
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("appears after a short delay and stays long enough to read", () => {
    render(<GlobalLoader />);
    let end;
    act(() => { end = beginActivity(); });
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    act(() => end());
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("stays while one of two requests is still running", () => {
    render(<GlobalLoader />);
    let a, b;
    act(() => { a = beginActivity(); b = beginActivity(); });
    act(() => vi.advanceTimersByTime(300));
    act(() => a());
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => b());
    act(() => vi.advanceTimersByTime(700));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("hovers over the page, above everything, and never takes a click", () => {
    expect(css).toMatch(/\.gl \{[^}]*position: fixed;[^}]*z-index: 3000;[^}]*pointer-events: none;/);
  });

  it("uses no inline style", () => {
    render(<GlobalLoader />);
    let end;
    act(() => { end = beginActivity(); });
    act(() => vi.advanceTimersByTime(300));
    expect(document.querySelector(".gl")).not.toBeNull();
    expect(document.querySelector(".gl [style]")).toBeNull();
    act(() => end());
  });
});

describe("request counting", () => {
  it("counts a request while it runs and stops after it ends, also when it fails", async () => {
    const seen = [];
    api.defaults.adapter = async (config) => {
      seen.push(isBusy());
      if (config.url === "/fail") {
        const err = new Error("boom");
        err.config = config;
        throw err;
      }
      return { data: [], status: 200, statusText: "OK", headers: {}, config };
    };
    await getCompanies();
    await api.get("/fail").catch(() => {});
    expect(seen).toEqual([true, true]);
    expect(isBusy()).toBe(false);
  });

  it("does not count the new-data poll or the search as you type", async () => {
    const seen = [];
    api.defaults.adapter = async (config) => {
      seen.push(isBusy());
      return { data: [], status: 200, statusText: "OK", headers: {}, config };
    };
    await getDataStatus();
    await searchEmployees("ann");
    expect(seen).toEqual([false, false]);
    expect(isBusy()).toBe(false);
  });
});
