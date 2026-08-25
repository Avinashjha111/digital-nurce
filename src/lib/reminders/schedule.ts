// Every clinic today is in India, and the Timings field is what a
// receptionist types on their own clock -- so "4:11 pm" means 4:11 pm IST,
// not UTC. There's no per-clinic timezone setting yet, so this is a fixed
// Asia/Kolkata (UTC+5:30, no DST) offset rather than a real guess.
const IST_OFFSET_MINUTES = 5 * 60 + 30;

// Turns a medicine's explicit timings + duration into concrete reminder
// datetimes -- never guesses a schedule from free-text frequency/dosage,
// only from the structured fields a human confirmed during review.
//
// One reminder per (day, timing) pair, days 0..durationDays-1 starting
// from `from`'s IST calendar date (so day boundaries match the clinic's
// own day, not UTC's). Slots already in the past relative to `from` are
// dropped -- this is what makes "approved at 3pm IST with an 8am timing"
// naturally skip straight to tomorrow's 8am instead of scheduling a
// reminder in the past.
export function buildReminderSchedule(
  timings: string[] | null,
  durationDays: number | null,
  from: Date
): Date[] {
  if (!timings || timings.length === 0 || !durationDays || durationDays <= 0) {
    return [];
  }

  const parsedTimings = timings
    .map((t) => parseTiming(t))
    .filter((t): t is { hour: number; minute: number } => t !== null);

  if (parsedTimings.length === 0) return [];

  // Shift `from` forward by the IST offset so reading its UTC-getters back
  // gives IST wall-clock calendar fields, then shift each built slot back
  // by the same offset to get the real UTC instant to store.
  const fromIst = new Date(from.getTime() + IST_OFFSET_MINUTES * 60 * 1000);

  const slots: Date[] = [];
  for (let day = 0; day < durationDays; day++) {
    for (const { hour, minute } of parsedTimings) {
      const istSlotAsUtcMs = Date.UTC(
        fromIst.getUTCFullYear(),
        fromIst.getUTCMonth(),
        fromIst.getUTCDate() + day,
        hour,
        minute,
        0,
        0
      );
      const slot = new Date(istSlotAsUtcMs - IST_OFFSET_MINUTES * 60 * 1000);
      if (slot.getTime() >= from.getTime()) {
        slots.push(slot);
      }
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}

// Accepts both 24-hour ("14:00") and 12-hour with am/pm ("2:00 pm",
// "2:00pm") -- the review form's Timings field is free text, and staff
// naturally type either. Anything else is dropped rather than guessed.
function parseTiming(raw: string): { hour: number; minute: number } | null {
  const t = raw.trim();

  const h24 = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (h24) {
    const hour = Number(h24[1]);
    const minute = Number(h24[2]);
    if (hour > 23 || minute > 59) return null;
    return { hour, minute };
  }

  const h12 = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(t);
  if (h12) {
    let hour = Number(h12[1]);
    const minute = Number(h12[2]);
    if (hour < 1 || hour > 12 || minute > 59) return null;
    const meridiem = h12[3].toLowerCase();
    if (meridiem === "am") {
      if (hour === 12) hour = 0;
    } else if (hour !== 12) {
      hour += 12;
    }
    return { hour, minute };
  }

  return null;
}

// Reminder pages render server-side, where Intl's default timezone is
// whatever the VPS runs (UTC) -- not the clinic's own IST clock. Without
// this, a reminder scheduled for 4:11 pm IST would display as "4:11 PM"
// (actually the UTC instant's clock reading, i.e. 9:41 pm IST) and look
// wrong to the exact person who typed "4:11 pm" in the first place.
export function formatReminderTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
