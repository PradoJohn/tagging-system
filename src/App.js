import React, { useEffect, useState } from "react";
import "./style.css";
import TimeDisplay from "./TimeDisplay";
import History from "./History";

const STORAGE_KEY = "rei-tag-history";

// Load saved history from this browser (survives page refresh)
function loadHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [view, setView] = useState("generate");
  const [history, setHistory] = useState(loadHistory);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Storage unavailable (private mode, blocked) - history stays in memory
    }
  }, [history]);

  const addHistory = (entry) => setHistory((prev) => [entry, ...prev]);
  const removeHistory = (id) =>
    setHistory((prev) => prev.filter((item) => item.id !== id));
  const clearHistory = () => setHistory([]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <h1 className="app-title">REI Tag Generator</h1>
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
          <TimeDisplay addHistory={addHistory} />
        ) : (
          <History
            history={history}
            onRemove={removeHistory}
            onClear={clearHistory}
            onGoGenerate={() => setView("generate")}
          />
        )}
      </main>
    </div>
  );
}
