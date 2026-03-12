import React, { useState, useRef, useEffect } from "react";

function TimeDisplay({ addHistory }) {
  const [selectedValue, setSelectedValue] = useState("4"); // Default value set to 4
  const [startTimeInput, setStartTimeInput] = useState("");
  const [duration, setDuration] = useState("");
  const [fieldNumber, setFieldNumber] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [copySuccess, setCopySuccess] = useState("");
  const textAreaRef = useRef(null);
  const successMessages = [
    "Copied! You're a genius!",
    "Copied! You rock!",
    "Copied! Nailed it!",
    "Copied! High five!",
    "Copied! You’re on fire!",
    "Copied! Boom!",
    "Copied! Like a boss!",
    "Copied! You're unstoppable!",
    "Copied! Legendary!",
    "Copied! You deserve a cookie!",
    "Copied! Bravo!",
    "Copied! You’re a wizard!",
    "Copied! Super-duper!",
    "Copied! Marvelous!",
    "Copied! Epic win!",
    "Copied! That was awesome!",
    "Copied! Victory is yours!",
    "Copied! Fantastic!",
    "Copied! You're a star!",
    "Copied! Yay you!",
  ];

  useEffect(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const formattedTime = `${hours}:${minutes}`;
    setStartTimeInput(formattedTime);
  }, []);

  const handleChange = (event) => {
    setSelectedValue(event.target.value);
  };

  const handleStartTimeChange = (event) => {
    setStartTimeInput(event.target.value);
  };

  const handleDurationChange = (event) => {
    setDuration(event.target.value);
  };

  const handleFieldNumberChange = (event) => {
    setFieldNumber(event.target.value);
  };

  const handleClick = () => {
    const now = new Date();
    const [hours, minutes] = startTimeInput.split(":");
    now.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    const start = now;
    if (isNaN(start)) {
      setCopySuccess("Invalid start time");
      return;
    }
    const subtractedTime = new Date(start.getTime() - 3 * 60000); // Subtract duration minutes from start time
    const end = new Date(start.getTime() + selectedValue * 60 * 60000); // Add selected hours to start time
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    const shortOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    const formattedStartTime = start.toLocaleString("en-US", options);
    const formattedEndTime = end.toLocaleString("en-US", options);
    const formattedHistoryTime = start.toLocaleString("en-US", shortOptions);
    const formattedSubtractedTime = subtractedTime.toLocaleString(
      "en-US",
      shortOptions
    );

    setStartTime(formattedStartTime);
    setEndTime(formattedEndTime);

    addHistory({
      fieldNumber: fieldNumber,
      subtractedTime: formattedSubtractedTime,
      startTime: formattedHistoryTime,
      selectedValue: selectedValue,
    }); // Add start time to history

    const copyText = `REI ${selectedValue} HRS ${formattedStartTime}\nRE-ENTRY ${formattedEndTime}`;
    setCopySuccess("");

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(copyText)
        .then(() => {
          const randomMessage =
            successMessages[Math.floor(Math.random() * successMessages.length)];
          setCopySuccess(randomMessage);
        })
        .catch((err) => {
          console.error("Failed to copy: ", err);
          setCopySuccess("Failed to copy! Falling back to manual copy.");
          fallbackCopyText(copyText);
        });
    } else {
      fallbackCopyText(copyText);
    }
  };

  const fallbackCopyText = (text) => {
    const textArea = textAreaRef.current;
    textArea.value = text;
    textArea.style.display = "block";
    textArea.select();
    try {
      document.execCommand("copy");
      const randomMessage =
        successMessages[Math.floor(Math.random() * successMessages.length)];
      setCopySuccess(randomMessage);
    } catch (err) {
      console.error("Fallback: Oops, unable to copy", err);
      setCopySuccess("Failed to copy!");
    }
    textArea.style.display = "none";
  };

  return (
    <div>
      <div className="form-group">
        <label htmlFor="time-select">Set REI:</label>
        <select id="time-select" value={selectedValue} onChange={handleChange}>
          <option value="4">4</option>
          <option value="12">12</option>
          <option value="24">24</option>
          <option value="48">48</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="start-time-input">Set Finish Time:</label>
        <input
          id="start-time-input"
          type="time"
          value={startTimeInput}
          onChange={handleStartTimeChange}
        />
      </div>
      {/* <div className="form-group">
        <label htmlFor="duration-input">Duration:</label>
        <input
          id="duration-input"
          type="number"
          value={duration}
          onChange={handleDurationChange}
          placeholder="Barcode"
        />
      </div> */}
      <div className="form-group">
        <label htmlFor="field-number-input">Field #:</label>
        <input
          id="field-number-input"
          type="text"
          value={fieldNumber}
          onChange={handleFieldNumberChange}
        />
      </div>
      <button onClick={handleClick}>Generate Tag</button>
      {startTime && endTime && (
        <div>
          <p
            id="display-text"
            style={{
              color: "lightgreen",
              fontSize: "15px",
              fontWeight: "bold",
            }}
          >
            REI {selectedValue} HRS {startTime}
            <br />
            RE-ENTRY {endTime}
          </p>
          <textarea
            ref={textAreaRef}
            style={{
              position: "absolute",
              left: "-9999px",
              top: "0",
              opacity: "0",
            }}
            readOnly
          ></textarea>
          {copySuccess && (
            <p
              style={{
                fontSize: "12px",
              }}
            >
              Tag is {copySuccess}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default TimeDisplay;
