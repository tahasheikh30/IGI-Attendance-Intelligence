import { useCallback, useEffect, useMemo, useState } from "react";
import { getUsers, updateUser } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../Toaster";
import { SettingGroup } from "./controls";

const ROLE_LABEL = { admin: "HR admin", hod: "HOD", manager: "Manager" };

/**
 * Who can administer the app. An administrator can promote any active account here, and remove another
 * administrator (never themselves; the server also refuses to remove the last active one). Promotion
 * clears the person's department or company grants, because an administrator sees everything.
 */
export default function AdministratorsSection() {
  const { me, refreshMe } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(null);   // { user, action: "promote" | "demote", role }
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    return getUsers().then(setUsers).catch(() => setError("Couldn't load the accounts."));
  }, []);
  useEffect(() => { load(); }, [load]);

  const admins = useMemo(() => (users || []).filter((u) => u.role === "admin"), [users]);
  const others = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users || [])
      .filter((u) => u.role !== "admin")
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
  }, [users, query]);
  const activeAdmins = admins.filter((u) => u.active).length;

  async function confirm() {
    const { user, action, role } = pending;
    setBusy(true);
    try {
      await updateUser(user.id, { role: action === "promote" ? "admin" : role });
      toast.success(
        action === "promote" ? `${user.name} is now an administrator` : `${user.name} is no longer an administrator`,
        { category: "users" },
      );
      setPending(null);
      await load();
      refreshMe?.();
    } catch (err) {
      toast.error("Couldn't change the role", {
        message: err?.response?.data?.detail || "Something went wrong. Try again.", category: "users",
      });
    } finally {
      setBusy(false);
    }
  }

  const prompt = (user, action) => setPending({ user, action, role: "manager" });

  function renderConfirm(user) {
    if (!pending || pending.user.id !== user.id) return null;
    const promote = pending.action === "promote";
    return (
      <div className="admin-confirm" role="group" aria-label={`Confirm change for ${user.name}`}>
        <p>
          {promote
            ? `Make ${user.name} an administrator? They will be able to see every company and department, upload and delete data, and manage accounts. Their current department or company access is replaced.`
            : `Remove ${user.name} as an administrator? They keep their account but lose admin rights.`}
        </p>
        {!promote && (
          <label className="admin-confirm-role">
            Their new role
            <select className="select" value={pending.role} onChange={(e) => setPending({ ...pending, role: e.target.value })}>
              <option value="manager">Manager (no access until departments are granted)</option>
              <option value="hod">HOD (no access until companies are granted)</option>
            </select>
          </label>
        )}
        <div className="admin-confirm-actions">
          <button type="button" className="btn-outline" onClick={() => setPending(null)} disabled={busy}>Cancel</button>
          <button type="button" className={promote ? "btn-primary" : "btn-primary btn-danger-solid"} onClick={confirm} disabled={busy}>
            {promote ? "Make administrator" : "Remove administrator"}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="notice notice-warn" role="alert">{error} <button type="button" className="link-btn" onClick={load}>Try again</button></p>;
  }
  if (!users) return <p className="setting-hint">Loading accounts…</p>;

  return (
    <>
      <SettingGroup title="Current administrators" hint="Administrators have full access. Keep this list short.">
        <ul className="admin-list" aria-label="Administrators">
          {admins.map((u) => {
            const isSelf = u.id === me?.id;
            const last = u.active && activeAdmins <= 1;
            return (
              <li key={u.id} className="admin-item">
                <div className="admin-item-main">
                  <span className="admin-item-name">{u.name}{isSelf && <span className="admin-tag">You</span>}{!u.active && <span className="admin-tag admin-tag-off">Inactive</span>}</span>
                  <span className="admin-item-sub">{u.username}</span>
                </div>
                {isSelf ? (
                  <span className="setting-hint">Another administrator can change your role.</span>
                ) : last ? (
                  <span className="setting-hint">The only active administrator.</span>
                ) : (
                  <button type="button" className="btn-outline" aria-label={`Remove ${u.name} as administrator`}
                    onClick={() => prompt(u, "demote")}>Remove admin</button>
                )}
                {renderConfirm(u)}
              </li>
            );
          })}
        </ul>
      </SettingGroup>

      <SettingGroup title="Make someone an administrator">
        <input className="login-input" type="search" placeholder="Search by name or username" aria-label="Search accounts"
          value={query} onChange={(e) => setQuery(e.target.value)} />
        <ul className="admin-list" aria-label="Other accounts">
          {others.length === 0 && <li className="setting-hint">No matching accounts.</li>}
          {others.map((u) => (
            <li key={u.id} className="admin-item">
              <div className="admin-item-main">
                <span className="admin-item-name">{u.name}{!u.active && <span className="admin-tag admin-tag-off">Inactive</span>}</span>
                <span className="admin-item-sub">{u.username} · {ROLE_LABEL[u.role] || u.role}</span>
              </div>
              <button type="button" className="btn-outline" disabled={!u.active}
                title={u.active ? undefined : "Reactivate this account first"}
                aria-label={`Make ${u.name} an administrator`} onClick={() => prompt(u, "promote")}>Make admin</button>
              {renderConfirm(u)}
            </li>
          ))}
        </ul>
      </SettingGroup>
    </>
  );
}
