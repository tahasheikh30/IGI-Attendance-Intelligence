import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../Toaster";
import { SettingGroup, SettingRow } from "./controls";

export const ROLE_LABEL = { admin: "HR admin", hod: "Head of Department", manager: "Manager" };

function accessSummary(me) {
  if (me.role === "admin") return "Every company and department";
  if (me.role === "hod") {
    return me.companies?.length ? me.companies.join(", ") : "No companies granted yet";
  }
  const depts = me.departments || [];
  return depts.length ? depts.map((d) => (d.company ? `${d.dept} (${d.company})` : d.dept)).join(", ") : "No departments granted yet";
}

const MIN_LENGTH = 8;

/** Change your own password. The server checks the current one and signs you out of every other device. */
function PasswordForm() {
  const { changePassword } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function reset() { setOpen(false); setCurrent(""); setNext(""); setAgain(""); setError(null); }

  async function submit(e) {
    e.preventDefault();
    if (next.length < MIN_LENGTH) return setError(`The new password must be at least ${MIN_LENGTH} characters.`);
    if (next !== again) return setError("The two new passwords do not match.");
    if (next === current) return setError("Choose a password different from your current one.");
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      toast.success("Password changed", { message: "You were signed out on your other devices.", category: null });
      reset();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Couldn't change the password. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <SettingRow title="Password" description="Change the password you sign in with.">
        <button type="button" className="btn-outline" onClick={() => setOpen(true)}>Change password</button>
      </SettingRow>
    );
  }
  return (
    <form className="password-form" onSubmit={submit} aria-label="Change password">
      <label>Current password
        <input className="login-input" type="password" autoComplete="current-password" value={current}
          onChange={(e) => setCurrent(e.target.value)} required />
      </label>
      <label>New password
        <input className="login-input" type="password" autoComplete="new-password" value={next}
          onChange={(e) => setNext(e.target.value)} required />
      </label>
      <label>Repeat new password
        <input className="login-input" type="password" autoComplete="new-password" value={again}
          onChange={(e) => setAgain(e.target.value)} required />
      </label>
      {error && <p className="notice notice-warn" role="alert">{error}</p>}
      <div className="admin-confirm-actions">
        <button type="button" className="btn-outline" onClick={reset} disabled={busy}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={busy || !current || !next || !again}>Save password</button>
      </div>
    </form>
  );
}

export default function AccountSection({ onSignOut }) {
  const { me } = useAuth();
  if (!me) return null;
  return (
    <>
      <SettingGroup title="Profile" hint="Your name, role and access are managed by an HR administrator.">
        <SettingRow title="Name"><span className="setting-value">{me.name}</span></SettingRow>
        <SettingRow title="Username"><span className="setting-value">{me.username}</span></SettingRow>
        <SettingRow title="Role"><span className="setting-value">{ROLE_LABEL[me.role] || me.role}</span></SettingRow>
        <SettingRow title="Can see" description="What the dashboard shows you.">
          <span className="setting-value setting-value-wrap">{accessSummary(me)}</span>
        </SettingRow>
      </SettingGroup>
      <SettingGroup title="Session">
        <PasswordForm />
        <SettingRow title="Sign out" description="Ends this session on this device.">
          <button type="button" className="btn-outline" onClick={onSignOut}>Sign out</button>
        </SettingRow>
      </SettingGroup>
    </>
  );
}
