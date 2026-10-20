// Shared settings and helpers for the REI Tag Generator

export const REI_OPTIONS = [4, 12, 24, 48];

// Spray start is recorded as this many minutes before the finish time
export const START_OFFSET_MINUTES = 3;

export const SUCCESS_MESSAGES = [
  "Copied! You're a genius!",
  "Copied! You rock!",
  "Copied! Nailed it!",
  "Copied! High five!",
  "Copied! You're on fire!",
  "Copied! Boom!",
  "Copied! Like a boss!",
  "Copied! You're unstoppable!",
  "Copied! Legendary!",
  "Copied! You deserve a cookie!",
  "Copied! Bravo!",
  "Copied! You're a wizard!",
  "Copied! Super-duper!",
  "Copied! Marvelous!",
  "Copied! Epic win!",
  "Copied! That was awesome!",
  "Copied! Victory is yours!",
  "Copied! Fantastic!",
  "Copied! You're a star!",
  "Copied! Yay you!",
];

export const randomSuccessMessage = () =>
  SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];

// Pad numeric field numbers to 3 digits (1 -> 001, 12 -> 012).
// Values with letters (e.g. "12A") are kept as typed.
export const formatFieldNumber = (value) => {
  const trimmed = String(value ?? "").trim();
  return /^\d+$/.test(trimmed) ? trimmed.padStart(3, "0") : trimmed;
};

// Current time as "HH:MM" for <input type="time">
export const currentTimeValue = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

// Today's date at the selected "HH:MM" time
export const buildFinishDate = (timeValue) => {
  if (!timeValue) return null;
  const [hours, minutes] = timeValue.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const calculateTimes = (finish, reiHours) => ({
  start: new Date(finish.getTime() - START_OFFSET_MINUTES * 60000),
  finish,
  reentry: new Date(finish.getTime() + reiHours * 3600000),
});

// ---- Formatting ----

// Same format as the original app, e.g. "Monday, October 19, 2026 at 03:10 PM"
const TAG_FORMAT = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

export const formatTagDateTime = (date) =>
  new Date(date).toLocaleString("en-US", TAG_FORMAT);

export const buildTagText = (rei, finish, reentry) =>
  `REI ${rei} HRS ${formatTagDateTime(finish)}\nRE-ENTRY ${formatTagDateTime(reentry)}`;

// "03:07 PM"
export const formatTime = (date) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

// "10/19/2026"
export const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

// "Tue 10/20, 3:10 AM"
export const formatDayTime = (date) => {
  const d = new Date(date);
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  const md = d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} ${md}, ${time}`;
};

export const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ---- Clipboard ----

export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Clipboard API failed, trying fallback:", err);
    }
  }

  // Fallback for older browsers / non-secure contexts
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (err) {
    console.error("Fallback copy failed:", err);
  }
  document.body.removeChild(textArea);
  return copied;
}
