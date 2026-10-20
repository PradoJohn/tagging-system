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

// ---- Time zone ----
// Every time in the app is Hawaii time, whatever timezone the phone is set to.
// Hawaii doesn't use daylight saving, so it is always UTC-10.
export const TIME_ZONE = "Pacific/Honolulu";
const HAWAII_UTC_OFFSET_HOURS = -10;

// Today's date and the current time in Hawaii, as numbers
export const hawaiiNowParts = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
  };
};

// Current Hawaii time as "HH:MM" for <input type="time">
export const currentTimeValue = () => {
  const { hour, minute } = hawaiiNowParts();
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

// Add minutes to an "HH:MM" value. Stops at 23:59 rather than wrapping to
// 00:00, because the finish date is always today.
// An empty value starts from the current time.
export const addMinutesToTimeValue = (timeValue, minutes) => {
  const base = /^\d{2}:\d{2}$/.test(timeValue || "") ? timeValue : currentTimeValue();
  const [h, m] = base.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

// Today's Hawaii date at the selected "HH:MM" Hawaii time
export const buildFinishDate = (timeValue, now = new Date()) => {
  if (!timeValue) return null;
  const [hours, minutes] = timeValue.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const { year, month, day } = hawaiiNowParts(now);
  return new Date(
    Date.UTC(year, month - 1, day, hours - HAWAII_UTC_OFFSET_HOURS, minutes, 0, 0)
  );
};

// Start time rule:
// If the most recent field finished less than START_OFFSET_MINUTES before
// this finish, the sprayer went straight from that field to this one, so
// this field started when that one ended. Otherwise, start is
// START_OFFSET_MINUTES before finish.
// A previous finish that is AFTER this finish (e.g. a backdated tag) is
// ignored and the default applies.
export const resolveStart = (finish, previousFinish) => {
  const offsetMs = START_OFFSET_MINUTES * 60000;
  if (previousFinish) {
    const prev = new Date(previousFinish);
    const gap = finish.getTime() - prev.getTime();
    if (!Number.isNaN(gap) && gap >= 0 && gap < offsetMs) {
      return { start: prev, fromPrevious: true };
    }
  }
  return { start: new Date(finish.getTime() - offsetMs), fromPrevious: false };
};

export const calculateTimes = (finish, reiHours, previousFinish = null) => {
  const { start, fromPrevious } = resolveStart(finish, previousFinish);
  return {
    start,
    finish,
    reentry: new Date(finish.getTime() + reiHours * 3600000),
    fromPrevious,
  };
};

// ---- Formatting ----

// Same format as the original app, e.g. "Monday, October 19, 2026 at 03:10 PM"
const TAG_FORMAT = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
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
    timeZone: TIME_ZONE,
  });

// "10/19/2026"
export const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    timeZone: TIME_ZONE,
  });

// "2026-10-19" (Hawaii date), used in the CSV file name
export const hawaiiDateStamp = (now = new Date()) => {
  const { year, month, day } = hawaiiNowParts(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

// "3:10 AM" (no leading zero, for the compact History list)
export const formatTimeShort = (date) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  });

// "Tue 10/20"
export const formatShortDay = (date) => {
  const d = new Date(date);
  const day = d.toLocaleDateString("en-US", { weekday: "short", timeZone: TIME_ZONE });
  const md = d.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    timeZone: TIME_ZONE,
  });
  return `${day} ${md}`;
};

// "Tuesday, 10/20/2026" (History date headings)
export const formatDayHeader = (date) =>
  `${new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: TIME_ZONE,
  })}, ${formatDate(date)}`;

// "Tue 10/20, 3:10 AM"
export const formatDayTime = (date) =>
  `${formatShortDay(date)}, ${formatTimeShort(date)}`;

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
