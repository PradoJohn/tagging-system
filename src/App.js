import React, { useState } from "react";
import "./style.css";
import TimeDisplay from "./TimeDisplay";
import History from "./History";

export default function App() {
  const [view, setView] = useState("main");
  const [history, setHistory] = useState([]);

  const addHistory = (entry) => {
    setHistory([...history, entry]);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h3>Tag Generator</h3>
          <button
            className="history-button"
            onClick={() => setView(view === "main" ? "history" : "main")}
          >
            {view === "main" ? "History" : "Back"}
          </button>
        </div>
        {view === "main" ? (
          <TimeDisplay addHistory={addHistory} />
        ) : (
          <History history={history} />
        )}
      </header>
    </div>
  );
}
