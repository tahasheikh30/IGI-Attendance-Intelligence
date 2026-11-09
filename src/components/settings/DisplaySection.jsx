import { usePreferences } from "../../context/PreferencesContext";
import { SettingGroup, SettingRow } from "./controls";
import SelectMenu from "../SelectMenu";

const DAYS = [[30, "30 days"], [90, "90 days"], [180, "180 days"], [365, "1 year"]];

export default function DisplaySection() {
  const { prefs, update } = usePreferences();
  const d = prefs.display;
  return (
    <SettingGroup title="Appearance and defaults" hint="The opening page and window apply each time you sign in. Changing the window in the top bar still works for the session.">
      <SettingRow title="Opening page" description="Where you land after signing in.">
        <SelectMenu ariaLabel="Opening page" value={d.default_view}
          options={[{ value: "overview", label: "Overview" }, { value: "analytics", label: "Analytics" }]}
          onChange={(v) => update({ display: { default_view: v } })} />
      </SettingRow>
      <SettingRow title="Default window" description="How far back the dashboard looks to begin with.">
        <SelectMenu ariaLabel="Default window" value={d.default_days}
          options={DAYS.map(([v, label]) => ({ value: v, label }))}
          onChange={(v) => update({ display: { default_days: Number(v) } })} />
      </SettingRow>
      <SettingRow title="Theme" description="Light or dark colours. Applied straight away.">
        <SelectMenu ariaLabel="Theme" value={d.theme}
          options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
          onChange={(v) => update({ display: { theme: v } })} />
      </SettingRow>
    </SettingGroup>
  );
}
