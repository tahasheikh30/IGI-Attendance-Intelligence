import { usePreferences } from "../../context/PreferencesContext";
import { SettingGroup, SettingRow, Switch } from "./controls";

const CATEGORIES = [
  { id: "data", title: "New attendance data", description: "When a newer upload makes the numbers on screen out of date.", adminOnly: false },
  { id: "access", title: "Access changes", description: "When an administrator changes your role or the departments you can see.", adminOnly: false },
  { id: "uploads", title: "Uploads", description: "When an upload you make finishes or fails, or is deleted.", adminOnly: true },
  { id: "users", title: "Accounts", description: "When you create, change, promote or remove an account.", adminOnly: true },
];

export default function NotificationsSection({ isAdmin }) {
  const { prefs, update } = usePreferences();
  const n = prefs.notifications;
  const visible = CATEGORIES.filter((c) => isAdmin || !c.adminOnly);
  return (
    <>
      <SettingGroup title="Notifications" hint="Errors are always shown, whatever is switched off here.">
        <SettingRow title="Notifications" description="The master switch. Off hides everything below except errors.">
          <Switch label="Notifications" checked={n.enabled} onChange={(v) => update({ notifications: { enabled: v } })} />
        </SettingRow>
        <SettingRow title="Pop-ups" description="Show a message in the corner. Off keeps them in your notification list only." locked={!n.enabled}>
          <Switch label="Pop-ups" checked={n.popups} disabled={!n.enabled}
            onChange={(v) => update({ notifications: { popups: v } })} />
        </SettingRow>
      </SettingGroup>
      <SettingGroup title="What to tell me about">
        {visible.map((c) => (
          <SettingRow key={c.id} title={c.title} description={c.description} locked={!n.enabled}>
            <Switch label={c.title} checked={n.categories[c.id]} disabled={!n.enabled}
              onChange={(v) => update({ notifications: { categories: { [c.id]: v } } })} />
          </SettingRow>
        ))}
      </SettingGroup>
    </>
  );
}
