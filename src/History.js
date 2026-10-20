import React from "react";
import { formatDate, formatDayTime, formatTime } from "./utils";

// Wrap values containing commas, quotes, or line breaks in quotes
const csvEscape = (value) => {
  const s = String(value ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Write as ="001" so Excel keeps it as text (leading zeros stay)
const asExcelText = (value) => `="${String(value ?? "").replace(/"/g, '""')}"`;

const localDateStamp = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
};

function History({ history, onRemove, onClear, onGoGenerate }) {
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

    // \uFEFF lets Excel read the file as UTF-8
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rei-tag-history-${localDateStamp()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (window.confirm("Clear all history? Export a CSV first if you need a copy.")) {
      onClear();
    }
  };

  const handleRemove = (item) => {
    if (window.confirm(`Remove the tag for Field ${item.fieldNumber}?`)) {
      onRemove(item.id);
    }
  };

  if (history.length === 0) {
    return (
      <div className="card empty">
        <p className="empty-title">No tags yet</p>
        <p>Tags you generate will appear here, ready to export as a CSV.</p>
        <button type="button" className="btn btn-primary" onClick={onGoGenerate}>
          Generate a Tag
        </button>
      </div>
    );
  }

  return (
    <section>
      <div className="history-toolbar">
        <h2 className="section-title">
          History <span className="count">({history.length})</span>
        </h2>
        <div className="toolbar-actions">
          <button type="button" className="btn btn-primary" onClick={exportCsv}>
            Export CSV
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleClear}>
            Clear All
          </button>
        </div>
      </div>

      <div className="card table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Field #</th>
              <th>REI</th>
              <th>Start</th>
              <th>End</th>
              <th>Re-Entry</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id}>
                <td data-label="Date">{formatDate(item.finish)}</td>
                <td data-label="Field #" className="cell-strong">
                  {item.fieldNumber}
                </td>
                <td data-label="REI">{item.rei} hrs</td>
                <td data-label="Start">{formatTime(item.start)}</td>
                <td data-label="End">{formatTime(item.finish)}</td>
                <td data-label="Re-Entry" className="cell-strong">
                  {formatDayTime(item.reentry)}
                </td>
                <td className="cell-actions">
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => handleRemove(item)}
                    aria-label={`Remove tag for Field ${item.fieldNumber}`}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="hint history-note">
        History is saved on this device only. Export a CSV to keep a record.
      </p>
    </section>
  );
}

export default History;
