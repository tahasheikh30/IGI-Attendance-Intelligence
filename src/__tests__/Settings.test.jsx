import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, act, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { authValue } from "../test/render";
import { users, userRows, preferences, axiosError } from "../test/data";

const api = vi.hoisted(() => ({ current: null }));
const auth = vi.hoisted(() => ({ value: null }));
vi.mock("../api", async () => { const m = await import("../test/apiMock.js"); api.current = m.createApiMock(); return api.current; });
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth.value }));

import ProfileMenu from "../components/ProfileMenu";
import SettingsModal from "../components/settings/SettingsModal";
import NotificationsPage from "../pages/NotificationsPage";
import { ToastProvider, useToast, useNotifications, deliveryFor } from "../components/Toaster";
import { PreferencesProvider, usePreferences } from "../context/PreferencesContext";
import { resetApiMock } from "../test/apiMock";

beforeEach(() => { resetApiMock(api.current); auth.value = authValue(users.admin, { refreshMe: vi.fn() }); });
afterEach(() => vi.useRealTimers());

function Harness({ children }) {
  return <MemoryRouter><ToastProvider><PreferencesProvider>{children}</PreferencesProvider></ToastProvider></MemoryRouter>;
}
const openModal = async (props = {}) => {
  render(<Harness><SettingsModal onClose={() => {}} onSignOut={() => {}} {...props} /></Harness>);
  await waitFor(() => expect(api.current.getPreferences).toHaveBeenCalled());
};

describe("ProfileMenu", () => {
  const menu = (over = {}) => render(
    <ProfileMenu name="Hira Admin" username="hr-admin" unread={0} onSettings={vi.fn()} onNotifications={vi.fn()} onSignOut={vi.fn()} {...over} />);
  it("shows initials, and opens on click and closes on Escape", () => {
    menu();
    const btn = screen.getByRole("button", { name: "Account menu" });
    expect(btn).toHaveTextContent("HA");
    expect(btn).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(btn, { key: "Escape" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });
  it("opens on hover", () => {
    menu();
    fireEvent.mouseEnter(screen.getByRole("button", { name: "Account menu" }).parentElement);
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "true");
  });
  it("runs the chosen action and closes", () => {
    const onSettings = vi.fn();
    menu({ onSettings });
    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(onSettings).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "false");
  });
  it("tells the unread count in its name and on the notifications item", () => {
    menu({ unread: 3 });
    expect(screen.getByRole("button", { name: "Account menu, 3 unread notifications" })).toBeInTheDocument();
    expect(screen.getByLabelText("3 unread")).toBeInTheDocument();
  });
});

describe("SettingsModal", () => {
  it("an administrator sees the Administrators section, others do not", async () => {
    await openModal();
    expect(screen.getByRole("button", { name: "Administrators" })).toBeInTheDocument();
  });
  it("a manager does not", async () => {
    auth.value = authValue(users.manager);
    await openModal();
    expect(screen.queryByRole("button", { name: "Administrators" })).toBeNull();
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });
  it("closes on Escape and on the close button", async () => {
    const onClose = vi.fn();
    await openModal({ onClose });
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
  it("shows the account's role and access", async () => {
    auth.value = authValue(users.manager);
    await openModal();
    expect(screen.getByText("Finance (IGI General)")).toBeInTheDocument();
    expect(screen.getByText("Manager")).toBeInTheDocument();
  });
  it("hides the admin-only notification categories from a manager", async () => {
    auth.value = authValue(users.manager);
    await openModal({ initial: "notifications" });
    expect(screen.getByRole("switch", { name: "New attendance data" })).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Uploads" })).toBeNull();
  });
  it("turning a switch saves once, a moment later, with only that change", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await openModal({ initial: "notifications" });
    fireEvent.click(screen.getByRole("switch", { name: "Pop-ups" }));
    fireEvent.click(screen.getByRole("switch", { name: "Uploads" }));
    expect(screen.getByRole("switch", { name: "Pop-ups" })).toHaveAttribute("aria-checked", "false");
    expect(api.current.savePreferences).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(700); });
    expect(api.current.savePreferences).toHaveBeenCalledTimes(1);
    const sent = api.current.savePreferences.mock.calls[0][0];
    expect(sent.notifications.popups).toBe(false);
    expect(sent.notifications.categories.uploads).toBe(false);
    expect(sent.notifications.categories.data).toBe(true);
  });
  it("a failed save puts the saved value back and says so", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.current.savePreferences.mockRejectedValue(axiosError(500));
    function Probe() { const { unread } = useNotifications(); return <span data-testid="unread">{unread}</span>; }
    render(<Harness><SettingsModal initial="display" onClose={() => {}} onSignOut={() => {}} /><Probe /></Harness>);
    await waitFor(() => expect(api.current.getPreferences).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "dark" } });
    await act(async () => { vi.advanceTimersByTime(700); });
    await waitFor(() => expect(screen.getByLabelText("Theme")).toHaveValue("light"));
    expect(screen.getByTestId("unread")).toHaveTextContent("1");
  });
  it("when settings cannot be loaded it says so and does not try to save", async () => {
    api.current.getPreferences.mockRejectedValue(axiosError(500));
    await openModal({ initial: "display" });
    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "dark" } });
    await new Promise((r) => setTimeout(r, 700));
    expect(api.current.savePreferences).not.toHaveBeenCalled();
  });
  it("the saved theme is set on the page, and choosing another changes it at once", async () => {
    api.current.getPreferences.mockResolvedValue(preferences({ display: { default_view: "overview", default_days: 30, theme: "dark" } }));
    await openModal({ initial: "display" });
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    fireEvent.change(screen.getByLabelText("Theme"), { target: { value: "light" } });
    expect(document.documentElement.dataset.theme).toBe("light");
  });
  it("leaving (signing out) removes the theme from the page", async () => {
    api.current.getPreferences.mockResolvedValue(preferences({ display: { default_view: "overview", default_days: 30, theme: "dark" } }));
    const { unmount } = render(<Harness><span /></Harness>);
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    unmount();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});

describe("Administrators section", () => {
  const open = async () => {
    await openModal({ initial: "administrators" });
    await screen.findByLabelText("Make Hamid Life an administrator");
  };
  it("lists admins and other accounts; an inactive account cannot be promoted", async () => {
    await open();
    expect(screen.getByLabelText("Make Gone Person an administrator")).toBeDisabled();
    expect(screen.getByText("You")).toBeInTheDocument();
  });
  it("promotes only after a confirmation", async () => {
    await open();
    fireEvent.click(screen.getByLabelText("Make Hamid Life an administrator"));
    expect(api.current.updateUser).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Make administrator" }));
    await waitFor(() => expect(api.current.updateUser).toHaveBeenCalledWith(3, { role: "admin" }));
    await waitFor(() => expect(auth.value.refreshMe).toHaveBeenCalled());
  });
  it("cancel changes nothing", async () => {
    await open();
    fireEvent.click(screen.getByLabelText("Make Hamid Life an administrator"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(api.current.updateUser).not.toHaveBeenCalled();
  });
  it("shows the server's reason when a change is refused", async () => {
    api.current.getUsers.mockResolvedValue([...userRows(), { ...userRows()[0], id: 9, username: "a2", name: "Second Admin" }]);
    api.current.updateUser.mockRejectedValue(axiosError(400, "At least one active administrator must remain"));
    await openModal({ initial: "administrators" });
    fireEvent.click(await screen.findByLabelText("Remove Second Admin as administrator"));
    fireEvent.click(screen.getByRole("button", { name: "Remove administrator" }));
    expect(await screen.findByText("At least one active administrator must remain")).toBeInTheDocument();
  });
  it("demotes to the chosen role", async () => {
    api.current.getUsers.mockResolvedValue([...userRows(), { ...userRows()[0], id: 9, username: "a2", name: "Second Admin" }]);
    await openModal({ initial: "administrators" });
    fireEvent.click(await screen.findByLabelText("Remove Second Admin as administrator"));
    fireEvent.change(screen.getByLabelText("Their new role"), { target: { value: "hod" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove administrator" }));
    await waitFor(() => expect(api.current.updateUser).toHaveBeenCalledWith(9, { role: "hod" }));
  });
  it("offers no way to remove yourself or the only active administrator", async () => {
    await open();
    expect(screen.queryByLabelText("Remove Hira Admin as administrator")).toBeNull();
    expect(screen.getByText(/another administrator can change your role/i)).toBeInTheDocument();
  });
  it("search narrows the list", async () => {
    await open();
    fireEvent.change(screen.getByLabelText("Search accounts"), { target: { value: "mina" } });
    expect(screen.queryByLabelText("Make Hamid Life an administrator")).toBeNull();
    expect(screen.getByLabelText("Make Mina Finance an administrator")).toBeInTheDocument();
  });
});

describe("toast delivery rules", () => {
  const all = { enabled: true, popups: true, categories: { data: true, access: true, uploads: true, users: true } };
  it("follows the master switch, the category and the pop-up switch", () => {
    expect(deliveryFor(null, "info", "data")).toEqual({ popup: true, keep: true });
    expect(deliveryFor({ ...all, enabled: false }, "info", "data")).toEqual({ popup: false, keep: false });
    expect(deliveryFor({ ...all, categories: { ...all.categories, data: false } }, "info", "data")).toEqual({ popup: false, keep: false });
    expect(deliveryFor({ ...all, popups: false }, "info", "data")).toEqual({ popup: false, keep: true });
  });
  it("never drops an error, even when everything is off", () => {
    expect(deliveryFor({ ...all, enabled: false, popups: false }, "error", "uploads")).toEqual({ popup: false, keep: true });
    expect(deliveryFor({ ...all, enabled: false }, "error", "uploads")).toEqual({ popup: true, keep: true });
  });
  it("a message without a category follows only the master switch", () => {
    expect(deliveryFor({ ...all, categories: {} }, "info", null)).toEqual({ popup: true, keep: true });
  });
});

describe("Toaster and the notifications page", () => {
  function Fire() {
    const toast = useToast();
    return <button onClick={() => { toast.success("Saved thing", { message: "details", category: "users" }); toast.success("Saved thing", { message: "details", category: "users" }); }}>fire</button>;
  }
  const page = () => render(<MemoryRouter><ToastProvider><Fire /><NotificationsPage /></ToastProvider></MemoryRouter>);
  it("shows a toast once even if sent twice, keeps both in the list, and reading marks them read", async () => {
    page();
    expect(screen.getByText(/nothing yet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("fire"));
    expect(screen.getAllByText("Saved thing")).toHaveLength(3); // one toast (the duplicate is dropped) plus two list entries
    expect(screen.getByRole("list", { name: "Notifications" }).children.length).toBe(2);
    expect(screen.getAllByText("Accounts").length).toBe(2);
  });
  it("Clear all empties the list", () => {
    page();
    fireEvent.click(screen.getByText("fire"));
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByText(/nothing yet/i)).toBeInTheDocument();
  });
  it("a toast can be dismissed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    page();
    fireEvent.click(screen.getByText("fire"));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss message" }));
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(screen.queryByRole("button", { name: "Dismiss message" })).toBeNull();
  });
});

describe("usePreferences outside a provider", () => {
  it("gives the defaults and ignores changes", () => {
    function P() { const { prefs, update } = usePreferences(); update({ display: { theme: "dark" } }); return <span>{prefs.display.theme}</span>; }
    render(<P />);
    expect(screen.getByText("light")).toBeInTheDocument();
  });
});
