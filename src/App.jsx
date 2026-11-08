import { useCallback, useEffect, useRef, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Overview from "./pages/Overview";
import DepartmentPage from "./pages/DepartmentPage";
import UploadPage from "./pages/UploadPage";
import AboutPage from "./pages/AboutPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import LoginPage from "./pages/LoginPage";
import UsersPage from "./pages/UsersPage";
import NotFoundPage from "./pages/NotFoundPage";
import EmployeeDrawer from "./components/EmployeeDrawer";
import Footer from "./components/Footer";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsModal from "./components/settings/SettingsModal";
import { ToastProvider, useToast } from "./components/Toaster";
import { RangeProvider } from "./context/RangeContext";
import { PreferencesProvider, usePreferences } from "./context/PreferencesContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { getDataStatus } from "./api";
import GlobalLoader from "./components/GlobalLoader";

const POLL_MS = 60_000;

// What an administrator can change about someone else's account, as one comparable string.
const accessSignature = (me) =>
  JSON.stringify([me?.role, me?.companies || [], (me?.departments || []).map(d => `${d.company}|${d.dept}`)]);

/**
 * Two quiet background checks while signed in. Every minute (and when the tab comes back to the front) it asks
 * whether a newer upload exists, and re-reads the account so a role or access change made by an administrator is
 * noticed. Neither one reloads anything by itself: it only tells the person.
 */
function useLiveWatchers() {
  const { me, refreshMe } = useAuth();
  const toast = useToast();

  // new data: the first answer is the baseline, a later different one is news. A change this person made
  // themselves (upload or delete) is adopted silently, since they already got a message for it.
  const version = useRef(null);
  const silent = useRef(false);
  const check = useCallback(async () => {
    try {
      const status = await getDataStatus();
      const quiet = silent.current;
      silent.current = false;
      if (version.current !== null && version.current !== status.version && !quiet) {
        toast.info("New attendance data is available", {
          message: status.latestDate ? `Now covers up to ${status.latestDate}. Reload to see it.` : "Reload to see it.",
          category: "data",
        });
      }
      version.current = status.version;
    } catch { /* a failed check is not worth a message */ }
  }, [toast]);

  useEffect(() => {
    check();
    const poll = () => { check(); refreshMe?.(); };
    const timer = setInterval(poll, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") poll(); };
    const onLocal = () => { silent.current = true; check(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("data:local-change", onLocal);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("data:local-change", onLocal);
    };
  }, [check, refreshMe]);

  // access: compare each fresh /me with the one before
  const signature = useRef(null);
  useEffect(() => {
    if (!me) return;
    const next = accessSignature(me);
    if (signature.current !== null && signature.current !== next) {
      toast.info("Your access was changed", { message: "An administrator updated your role or departments.", category: "access" });
    }
    signature.current = next;
  }, [me, toast]);
}

function AuthedApp() {
  const { isAdmin } = useAuth();
  // Owned here rather than inside a page component: the navbar search can
  // find an employee in any department from any page, so the drawer it
  // opens has to live above the routed page content instead of belonging
  // to whichever page happens to be showing (Overview/DepartmentPage each
  // still keep their own separate drawer state for clicking a row directly).
  const [searchEmp, setSearchEmp] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { logout } = useAuth();
  const { prefs, loaded, loadFailed } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();
  useLiveWatchers();

  // Land on the saved opening page, once, and only when the person arrived at the plain "/".
  const landed = useRef(false);
  useEffect(() => {
    if (!loaded || loadFailed || landed.current) return;
    landed.current = true;
    if (prefs.display.default_view === "analytics" && location.pathname === "/") navigate("/analytics", { replace: true });
  }, [loaded, loadFailed, prefs.display.default_view, location.pathname, navigate]);

  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  return (
    <>
      <div className="app-shell">
        <div className="brand-strip" />
        <Navbar onSelectEmployee={setSearchEmp} onOpenSettings={() => setSettingsOpen(true)} />
        <div className="app-body">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/department/:dept" element={<DepartmentPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/about" element={<AboutPage />} />
              {isAdmin && <Route path="/upload" element={<UploadPage />} />}
              {isAdmin && <Route path="/users" element={<UsersPage />} />}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
        {/* Lives outside app-body (not inside main-content) so it spans the
            full page width instead of being capped at main-content's
            1180px reading width, and so app-body's flex:1 can push it down
            to sit flush against the bottom of the viewport on short pages
            instead of leaving a gap of page background beneath it. */}
        <Footer />
        {searchEmp && <EmployeeDrawer empNo={searchEmp} onClose={() => setSearchEmp(null)} />}
        {settingsOpen && <SettingsModal onClose={closeSettings} onSignOut={logout} />}
      </div>
    </>
  );
}

function Gate() {
  const { isAuthenticated, meLoading } = useAuth();
  if (isAuthenticated && meLoading) {
    // Briefly loading role/department info right after a token is found
    // (fresh login or page refresh) -- avoids flashing admin-only nav
    // items before we actually know the role.
    return <div className="empty-state"><span className="sr-only">Loading…</span></div>;
  }
  if (!isAuthenticated) return <LoginPage />;
  // The toast list and the settings belong to the signed in person: they are created after sign in and gone after
  // sign out, so the next person on this browser never sees them.
  return (
    <ToastProvider>
      <PreferencesProvider>
        <RangeProvider>
          <AuthedApp />
        </RangeProvider>
      </PreferencesProvider>
    </ToastProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GlobalLoader />
      <Gate />
    </AuthProvider>
  );
}
