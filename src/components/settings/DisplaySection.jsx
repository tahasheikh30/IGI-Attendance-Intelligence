import { usePreferences } from "../../context/PreferencesContext";
import { SettingGroup, SettingRow } from "./controls";

const DAYS = [[30, "30 days"], [90, "90 days"], [180, "180 days"], [365, "1 year"]];

export default function DisplaySection() {
  const { prefs, update } = usePreferences();
  const d = prefs.display;
  return (
    <SettingGroup title="Appearance and defaults" hint="The opening page and window apply each time you sign in. Changing the window in the top bar still works for the session.">
      <SettingRow title="Opening page" description="Where you land after signing in.">
        <select className="select" aria-label="Opening page" value={d.default_view}
          onChange={(e) => update({ display: { default_view: e.target.value } })}>
          <option value="overview">Overview</option>
          <option value="analytics">Analytics</option>
        </select>
      </SettingRow>
      <SettingRow title="Default window" description="How far back the dashboard looks to begin with.">
        <select className="select" aria-label="Default window" value={d.default_days}
          onChange={(e) => update({ display: { default_days: Number(e.target.value) } })}>
          {DAYS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </SettingRow>
      <SettingRow title="Theme" description="Light or dark colours. Applied straight away.">
        <select className="select" aria-label="Theme" value={d.theme}
          onChange={(e) => update({ display: { theme: e.target.value } })}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </SettingRow>
    </SettingGroup>
  );
}
