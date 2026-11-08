import { useAuth } from "../../context/AuthContext";
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
        <SettingRow title="Sign out" description="Ends this session on this device.">
          <button type="button" className="btn-outline" onClick={onSignOut}>Sign out</button>
        </SettingRow>
      </SettingGroup>
    </>
  );
}
