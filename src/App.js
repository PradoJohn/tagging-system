import React, { useCallback, useEffect, useRef, useState } from "react";
import "./style.css";
import TimeDisplay from "./TimeDisplay";
import History from "./History";
import { sendTag, syncEnabled } from "./sync";
import { applyTheme, getInitialTheme, saveTheme } from "./theme";

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
);

const STORAGE_KEY = "rei-tag-history";
// Background records for tags removed from History before they were sent
// (e.g. no signal). They keep sending; the user doesn't see them.
const OUTBOX_KEY = "rei-tag-outbox";
const RETRY_INTERVAL_MS = 60000;

const loadList = (key) => {
  try {
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveList = (key, list) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Storage unavailable (private mode, blocked) - kept in memory only
  }
};

// Each tag has two independent upload states:
//
// recordState - the automatic background record (field number as typed)
//   "pending"  - not saved in Dataverse yet (retries until it gets through)
//   "recorded" - saved
//
// reportState - the A- row the user chooses to send from History
//   "draft"    - not reported; can be reviewed and removed
//   "queued"   - Report was tapped; sending (retries until it gets through)
//   "reported" - saved
const withStates = (item) => ({
  ...item,
  // Tags uploaded by the first auto-sync version were already recorded
  recordState: item.recordState || (item.synced ? "recorded" : "pending"),
  reportState: item.reportState || "draft",
});

// Load saved history from this browser (survives page refresh)
const loadHistory = () => loadList(STORAGE_KEY).map(withStates);
const loadOutbox = () => loadList(OUTBOX_KEY);

export default function App() {
  const [view, setView] = useState("generate");
  const [history, setHistory] = useState(loadHistory);
  const [outbox, setOutbox] = useState(loadOutbox);
  const [syncTick, setSyncTick] = useState(0);
  const [theme, setTheme] = useState(getInitialTheme);
  const [reportedRun, setReportedRun] = useState(0); // sent since last Report tap
  const inFlight = useRef(new Set());
  const syncOn = syncEnabled();

  useEffect(() => saveList(STORAGE_KEY, history), [history]);
  useEffect(() => saveList(OUTBOX_KEY, outbox), [outbox]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    saveTheme(next);
  };

  const requestSync = useCallback(() => setSyncTick((t) => t + 1), []);

  // Upload whatever hasn't reached Dataverse yet:
  //   - every tag's background record (sent as soon as it's generated)
  //   - the A- report row for tags the user has reported
  useEffect(() => {
    if (!syncOn) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    // onSaved runs only when the flow confirms the row is saved
    const send = async (item, kind, onSaved) => {
      const key = `${item.id}:${kind}`;
      if (inFlight.current.has(key)) return;
      inFlight.current.add(key);
      const ok = await sendTag(item, kind);
      inFlight.current.delete(key);
      if (ok) onSaved();
    };

    const markSaved = (id, update) =>
      setHistory((prev) => prev.map((h) => (h.id === id ? { ...h, ...update } : h)));

    // Records for tags already removed from History
    outbox.forEach((item) => {
      send(item, "record", () =>
        setOutbox((prev) => prev.filter((o) => o.id !== item.id))
      );
    });

    history.forEach((item) => {
      if (item.recordState === "pending") {
        send(item, "record", () =>
          markSaved(item.id, { recordState: "recorded", recordedAt: new Date().toISOString() })
        );
      }
      if (item.reportState === "queued") {
        send(item, "report", () => {
          markSaved(item.id, { reportState: "reported", reportedAt: new Date().toISOString() });
          setReportedRun((n) => n + 1);
        });
      }
    });
  }, [history, outbox, syncTick, syncOn]);

  // Retry anything unsent: back online, app reopened, and every minute
  useEffect(() => {
    if (!syncOn) return undefined;
    const onVisible = () => {
      if (document.visibilityState === "visible") requestSync();
    };
    window.addEventListener("online", requestSync);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(requestSync, RETRY_INTERVAL_MS);
    return () => {
      window.removeEventListener("online", requestSync);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [syncOn, requestSync]);

  // Generate Tag: the background record is sent right away by the effect above
  const addHistory = (entry) =>
    setHistory((prev) => [
      { ...entry, recordState: "pending", reportState: "draft" },
      ...prev,
    ]);
  // Removing a tag never cancels its background record: if that hasn't been
  // sent yet, it moves to the outbox and keeps sending.
  const keepUnsentRecords = (items) => {
    const unsent = items.filter((h) => h.recordState === "pending");
    if (unsent.length && syncOn) {
      setOutbox((prev) => [...prev, ...unsent.filter((u) => !prev.some((p) => p.id === u.id))]);
    }
  };

  const removeHistory = (id) => {
    keepUnsentRecords(history.filter((item) => item.id === id));
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const clearHistory = () => {
    keepUnsentRecords(history);
    setHistory([]);
  };

  // Report button: queue every draft tag for sending
  const reportAll = () => {
    setReportedRun(0);
    setHistory((prev) =>
      prev.map((h) => (h.reportState === "draft" ? { ...h, reportState: "queued" } : h))
    );
    requestSync();
  };

  const countState = (state) => history.filter((h) => h.reportState === state).length;
  const draftCount = syncOn ? countState("draft") : 0;
  const queuedCount = syncOn ? countState("queued") : 0;

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-title-row">
            <h1 className="app-title">REI Tag Generator</h1>
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-pressed={theme === "dark"}
              aria-label="Dark mode"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>
          <nav className="tabs" role="tablist" aria-label="Sections">
            <button
              type="button"
              role="tab"
              aria-selected={view === "generate"}
              className={`tab ${view === "generate" ? "active" : ""}`}
              onClick={() => setView("generate")}
            >
              Generate
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "history"}
              className={`tab ${view === "history" ? "active" : ""}`}
              onClick={() => setView("history")}
            >
              History
              {history.length > 0 && (
                <span className="badge">{history.length}</span>
              )}
            </button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {view === "generate" ? (
          <TimeDisplay addHistory={addHistory} lastTag={history[0] ?? null} />
        ) : (
          <History
            history={history}
            onRemove={removeHistory}
            onClear={clearHistory}
            onGoGenerate={() => setView("generate")}
            syncOn={syncOn}
            draftCount={draftCount}
            queuedCount={queuedCount}
            reportedRun={reportedRun}
            onReport={reportAll}
            onRetry={requestSync}
          />
        )}
      </main>
    </div>
  );
}
