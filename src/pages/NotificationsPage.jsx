import { useEffect } from "react";
import { useNotifications, ToneIcon } from "../components/Toaster";

const CATEGORY_LABEL = { data: "Data", access: "Access", uploads: "Uploads", users: "Accounts" };

function when(at) {
  return at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function NotificationsPage() {
  const { notifications, markAllRead, clearAll } = useNotifications();

  // opening the page is reading it
  useEffect(() => { markAllRead(); }, [markAllRead, notifications.length]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-sub">Messages from this session. They clear when you sign out or reload.</p>
        </div>
        {notifications.length > 0 && <button type="button" className="btn-outline" onClick={clearAll}>Clear all</button>}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">Nothing yet. New data, access changes and account activity will show up here.</div>
      ) : (
        <ul className="notif-list" aria-label="Notifications">
          {notifications.map((n) => (
            <li key={n.id} className={`notif-item notif-${n.tone}`}>
              <span className="notif-icon"><ToneIcon tone={n.tone} /></span>
              <div className="notif-body">
                <p className="notif-title">{n.title}</p>
                {n.message && <p className="notif-message">{n.message}</p>}
              </div>
              <div className="notif-meta">
                {n.category && <span className="notif-cat">{CATEGORY_LABEL[n.category] || n.category}</span>}
                <time dateTime={n.at.toISOString()}>{when(n.at)}</time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
