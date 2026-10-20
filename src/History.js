import React from "react";
import {
  formatDate,
  formatDayHeader,
  formatShortDay,
  formatTime,
  formatTimeShort,
  hawaiiDateStamp,
} from "./utils";

// Wrap values containing commas, quotes, or line breaks in quotes
const csvEscape = (value) => {
  const s = String(value ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Write as ="001" so Excel keeps it as text (leading zeros stay)
const asExcelText = (value) => `="${String(value ?? "").replace(/"/g, '""')}"`;

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// "10:29 AM" with AM/PM in its own span, so on very narrow phones it can
// drop to a second line instead of colliding with the next column
const TimeText = ({ date, className = "" }) => {
  const [time, period] = formatTimeShort(date).split(" ");
  return (
    <span className={`time-text ${className}`}>
      <span className="time-hm">{time}</span>{" "}
      <span className="time-ampm">{period}</span>
    </span>
  );
};

const STATE_LABELS = {
  draft: "Not reported",
  queued: "Sending…",
  reported: "Reported",
};

// Group tags under one heading per Hawaii day (history is newest first)
const groupByDay = (items) => {
  const groups = [];
  items.forEach((item) => {
    const key = formatDate(item.finish);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: formatDayHeader(item.finish), items: [] };
      groups.push(group);
    }
    group.items.push(item);
  });
  return groups;
};

function History({
  history,
  onRemove,
  onClear,
  onGoGenerate,
  syncOn = false,
  draftCount = 0,
  queuedCount = 0,
  reportedRun = 0,
  onReport,
  onRetry,
}) {
  const exportCsv = () => {
    const header = ["Date", "Field #", "REI (hrs)", "Start", "End", "Re-Entry"];

    // Oldest first in the file
    const rows = [...history].reverse().map((item) => [
      formatDate(item.finish),
      asExcelText(item.fieldNumber),
      item.rei,
      formatTime(item.start),
      formatTime(item.finish),
      `${formatDate(item.reentry)} ${formatTime(item.reentry)}`,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\r\n");

    // ﻿ lets Excel read the file as UTF-8
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rei-tag-history-${hawaiiDateStamp()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Delay so Safari has time to start the download
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleReport = () => {
    if (draftCount === 0) return;
    const message =
      `Report ${plural(draftCount, "tag")}?\n\n` +
      "Check the list first and remove any mistakes. Reported tags can't be changed from the app.";
    if (window.confirm(message)) {
      onReport();
    }
  };

  const handleClear = () => {
    let message = "Clear all history? Export a CSV first if you need a copy.";
    if (syncOn) {
      const notReported = draftCount + queuedCount;
      message =
        notReported > 0
          ? `${plural(notReported, "tag")} haven't been reported and won't be. Clear all history on this phone anyway?`
          : "Clear history from this phone? Reported tags stay in the database.";
    }
    if (window.confirm(message)) {
      onClear();
    }
  };

  const handleRemove = (item) => {
    let message = `Remove the tag for Field ${item.fieldNumber}?`;
    if (syncOn) {
      if (item.reportState === "reported") {
        message =
          `Field ${item.fieldNumber} is already reported. Removing it only clears it from this phone; ` +
          "it stays in the database. Remove from this phone?";
      } else if (item.reportState === "queued") {
        message =
          `Field ${item.fieldNumber} is being sent and may still reach the database. ` +
          "Remove it from this phone anyway?";
      } else {
        message = `Remove the tag for Field ${item.fieldNumber}? It won't be reported.`;
      }
    }
    if (window.confirm(message)) {
      onRemove(item.id);
    }
  };

  if (history.length === 0) {
    return (
      <div className="card empty">
        <p className="empty-title">No tags yet</p>
        <p>Tags you generate will appear here to review, report and export.</p>
        <button type="button" className="btn btn-primary" onClick={onGoGenerate}>
          Generate a Tag
        </button>
      </div>
    );
  }

  const groups = groupByDay(history);

  return (
    <section>
      <div className="history-toolbar">
        <h2 className="section-title">
          History <span className="count">({history.length})</span>
        </h2>
        <div className="toolbar-actions">
          <button
            type="button"
            className={`btn ${syncOn ? "btn-secondary" : "btn-primary"}`}
            onClick={exportCsv}
          >
            Export CSV
          </button>
          {syncOn && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleReport}
              disabled={draftCount === 0}
            >
              Report{draftCount > 0 ? ` (${draftCount})` : ""}
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={handleClear}>
            Clear All
          </button>
        </div>
      </div>

      {syncOn && queuedCount > 0 && (
        <div className="sync-banner" role="status">
          <span>
            Sending {plural(queuedCount, "tag")}… No signal? They'll send automatically
            when you're back online.
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}

      {syncOn && queuedCount === 0 && reportedRun > 0 && (
        <p className="report-done" role="status">
          ✓ {plural(reportedRun, "tag")} reported
        </p>
      )}

      <div className="card table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">Start</th>
              <th scope="col">End</th>
              <th scope="col">Re-Entry</th>
              <th scope="col">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.key}>
              <tr className="day-row">
                <th colSpan={5} scope="colgroup">
                  {group.label}
                </th>
              </tr>
              {group.items.map((item) => (
                <tr key={item.id} className={`tag-row state-${item.reportState || "draft"}`}>
                  <td className="cell-field">
                    <span className="field-num">{item.fieldNumber}</span>
                    {syncOn && (
                      <span className={`report-state report-${item.reportState || "draft"}`}>
                        {STATE_LABELS[item.reportState] || STATE_LABELS.draft}
                      </span>
                    )}
                  </td>
                  <td>
                    <TimeText date={item.start} />
                  </td>
                  <td>
                    <TimeText date={item.finish} />
                  </td>
                  <td className="cell-reentry">
                    <span className="reentry-day">{formatShortDay(item.reentry)}</span>
                    <TimeText date={item.reentry} className="reentry-time" />
                  </td>
                  <td className="cell-actions">
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => handleRemove(item)}
                      aria-label={`Remove tag for Field ${item.fieldNumber}`}
                      title="Remove"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none"
                        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      <p className="hint history-note">
        {syncOn
          ? "Check the list, remove any mistakes, then tap Report to send tags to the database."
          : "History is saved on this device only. Export a CSV to keep a record."}
      </p>
    </section>
  );
}

export default History;
