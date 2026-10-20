import React, { useMemo, useRef, useState } from "react";
import {
  REI_OPTIONS,
  START_OFFSET_MINUTES,
  addMinutesToTimeValue,
  buildFinishDate,
  buildTagText,
  calculateTimes,
  copyToClipboard,
  currentTimeValue,
  formatDayTime,
  formatFieldNumber,
  formatTime,
  makeId,
  randomSuccessMessage,
} from "./utils";

function TimeDisplay({ addHistory, lastTag = null }) {
  const [rei, setRei] = useState(4);
  const [finishTime, setFinishTime] = useState(currentTimeValue);
  const [fieldNumber, setFieldNumber] = useState("");
  const [error, setError] = useState("");
  const [tag, setTag] = useState(null);
  const [copyStatus, setCopyStatus] = useState("");
  const fieldRef = useRef(null);

  // Live preview of start / re-entry before generating
  const preview = useMemo(() => {
    const finish = buildFinishDate(finishTime);
    return finish ? calculateTimes(finish, rei, lastTag?.finish) : null;
  }, [finishTime, rei, lastTag]);

  const handleGenerate = async (event) => {
    event.preventDefault();

    const field = formatFieldNumber(fieldNumber);
    if (!field) {
      setError("Enter a field number.");
      fieldRef.current?.focus();
      return;
    }

    const finish = buildFinishDate(finishTime);
    if (!finish) {
      setError("Set the finish time.");
      return;
    }

    const { start, reentry } = calculateTimes(finish, rei, lastTag?.finish);
    const text = buildTagText(rei, finish, reentry);

    addHistory({
      id: makeId(),
      createdAt: new Date().toISOString(),
      fieldNumber: field,
      rei,
      start: start.toISOString(),
      finish: finish.toISOString(),
      reentry: reentry.toISOString(),
    });

    setError("");
    setTag({ text, fieldNumber: field });
    setFieldNumber(""); // ready for the next field

    const copied = await copyToClipboard(text);
    setCopyStatus(
      copied
        ? randomSuccessMessage()
        : "Couldn't copy automatically. Press and hold the tag text to copy it."
    );
  };

  const handleCopyAgain = async () => {
    if (!tag) return;
    const copied = await copyToClipboard(tag.text);
    setCopyStatus(copied ? randomSuccessMessage() : "Copy failed. Copy the text manually.");
  };

  return (
    <>
      <form className="card form" onSubmit={handleGenerate} noValidate>
        {/* 1. REI */}
        <fieldset className="field-group">
          <legend className="label">
            <span className="step">1</span> REI (hours)
          </legend>
          <div className="segmented" role="radiogroup" aria-label="REI hours">
            {REI_OPTIONS.map((hours) => (
              <button
                key={hours}
                type="button"
                role="radio"
                aria-checked={rei === hours}
                className={`segment ${rei === hours ? "selected" : ""}`}
                onClick={() => setRei(hours)}
              >
                {hours}
                <span className="segment-unit">hrs</span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* 2. Finish time */}
        <div className="field-group">
          <label className="label" htmlFor="finish-time">
            <span className="step">2</span> Spray finish time
          </label>
          <div className="time-row">
            <input
              id="finish-time"
              type="time"
              className="input"
              value={finishTime}
              onChange={(e) => setFinishTime(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setFinishTime((t) => addMinutesToTimeValue(t, 1))}
              aria-label="Add 1 minute to finish time"
            >
              +1 min
            </button>
          </div>
          {preview && (
            <div className="preview">
              <div>
                <span className="preview-label">Start</span>
                <span className="preview-value">{formatTime(preview.start)}</span>
              </div>
              <div>
                <span className="preview-label">Re-entry</span>
                <span className="preview-value">{formatDayTime(preview.reentry)}</span>
              </div>
            </div>
          )}
          <p className="hint">
            {preview?.fromPrevious
              ? `Start set to Field ${lastTag.fieldNumber}'s finish (less than ${START_OFFSET_MINUTES} minutes earlier).`
              : `Start is ${START_OFFSET_MINUTES} minutes before finish, or the last field's finish if that was less than ${START_OFFSET_MINUTES} minutes earlier.`}
          </p>
        </div>

        {/* 3. Field # */}
        <div className="field-group">
          <label className="label" htmlFor="field-number">
            <span className="step">3</span> Field #
          </label>
          <input
            id="field-number"
            ref={fieldRef}
            type="text"
            className={`input ${error ? "invalid" : ""}`}
            value={fieldNumber}
            onChange={(e) => {
              setFieldNumber(e.target.value);
              if (error) setError("");
            }}
            placeholder="e.g. 001"
            autoComplete="off"
            enterKeyHint="go"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "field-error" : undefined}
          />
          {error && (
            <p id="field-error" className="error" role="alert">
              {error}
            </p>
          )}
        </div>

        <button type="submit" className="btn btn-primary btn-block btn-lg">
          Generate Tag
        </button>
      </form>

      {tag && (
        <section className="card tag-card" aria-live="polite">
          <h2 className="tag-card-title">Tag for Field {tag.fieldNumber}</h2>
          <p className="tag-text">{tag.text}</p>
          {copyStatus && <p className="copy-status">{copyStatus}</p>}
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={handleCopyAgain}
          >
            Copy Again
          </button>
        </section>
      )}
    </>
  );
}

export default TimeDisplay;
