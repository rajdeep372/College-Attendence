/**
 * Time utility functions for IST (Indian Standard Time, UTC+5:30) timetable comparisons.
 * Guarantees classes are ONLY marked as "Live Now / In Session" strictly between their exact start and end times.
 */

export interface TimeSlotInterval {
  startMinutes: number;
  endMinutes: number;
}

export interface ClassStatusResult {
  status: "Live Now" | "Upcoming" | "Completed";
  attendance: "In Session" | "Pending" | "Turnout Logged";
  isLive: boolean;
  startsInMinutes?: number;
}

/**
 * Returns the current time and day in Indian Standard Time (IST).
 */
export function getIstCurrentTime(): {
  currentMinutes: number;
  currentDay: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  formattedTime: string;
} {
  const now = new Date();

  // Extract IST 24-hour time string
  const istTimeString = now.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  const [hoursStr, minutesStr] = istTimeString.split(":");
  const hours = parseInt(hoursStr, 10) || 0;
  const minutes = parseInt(minutesStr, 10) || 0;
  const currentMinutes = hours * 60 + minutes;

  // Extract IST Day of week
  const istDateString = now.toLocaleDateString("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
  });

  const validDays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ] as const;

  const matchedDay =
    validDays.find((d) => d.toLowerCase() === istDateString.toLowerCase()) || "Monday";

  return {
    currentMinutes,
    currentDay: matchedDay as any,
    formattedTime: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
  };
}

/**
 * Parses any standard academic time slot string (e.g., "10:00 AM - 11:00 AM", "02:00 PM - 04:00 PM")
 * into minute offsets from midnight.
 */
export function parseTimeSlot(timeSlot: string): TimeSlotInterval | null {
  if (!timeSlot || typeof timeSlot !== "string") return null;

  const parts = timeSlot.split(/[-–—]|to/i);
  if (parts.length < 2) return null;

  const parseSinglePart = (raw: string): number | null => {
    const clean = raw.trim();
    // Matches "10:00 AM", "2:30PM", "11 AM", "14:00"
    const match = clean.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const meridiem = match[3] ? match[3].toUpperCase() : null;

    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;

    // Heuristic for slots without explicit AM/PM: 1-6 are afternoon (PM), 8-12 are morning (AM)
    if (!meridiem && hours >= 1 && hours <= 6) hours += 12;

    return hours * 60 + minutes;
  };

  const startMinutes = parseSinglePart(parts[0]);
  const endMinutes = parseSinglePart(parts[1]);

  if (startMinutes === null || endMinutes === null) return null;
  return { startMinutes, endMinutes };
}

/**
 * Computes strict real-time status of a scheduled class based on current IST clock.
 * A class is strictly "Live Now" ONLY between its exact start and end time.
 */
export function computeClassStatus(
  timeSlot: string,
  dayOfWeek?: string
): ClassStatusResult {
  const { currentMinutes, currentDay } = getIstCurrentTime();

  // If dayOfWeek is specified and does NOT match current day in IST
  if (dayOfWeek && dayOfWeek.trim().toLowerCase() !== currentDay.toLowerCase()) {
    return {
      status: "Upcoming",
      attendance: "Pending",
      isLive: false,
    };
  }

  const interval = parseTimeSlot(timeSlot);
  if (!interval) {
    return {
      status: "Upcoming",
      attendance: "Pending",
      isLive: false,
    };
  }

  const { startMinutes, endMinutes } = interval;

  // Strictly between start and end time
  if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    return {
      status: "Live Now",
      attendance: "In Session",
      isLive: true,
      startsInMinutes: 0,
    };
  }

  // Session has ended
  if (currentMinutes >= endMinutes) {
    return {
      status: "Completed",
      attendance: "Turnout Logged",
      isLive: false,
    };
  }

  // Session is upcoming
  const diff = startMinutes - currentMinutes;
  return {
    status: "Upcoming",
    attendance: "Pending",
    isLive: false,
    startsInMinutes: Math.max(0, diff),
  };
}

/**
 * Fast boolean check if a class is currently in session.
 */
export function isClassLiveNow(timeSlot: string, dayOfWeek?: string): boolean {
  return computeClassStatus(timeSlot, dayOfWeek).isLive;
}

