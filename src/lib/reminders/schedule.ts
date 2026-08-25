// Turns a medicine's explicit timings + duration into concrete reminder
// datetimes -- never guesses a schedule from free-text frequency/dosage,
// only from the structured fields a human confirmed during review.
//
// One reminder per (day, timing) pair, days 0..durationDays-1 starting
// from `from`'s calendar date. Timings are treated as UTC clock times
// (the app has no per-clinic timezone setting yet). Slots already in the
// past relative to `from` are dropped -- this is what makes "approved at
// 3pm with an 8am timing" naturally skip straight to tomorrow's 8am
// instead of scheduling a reminder in the past.
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

  const slots: Date[] = [];
  for (let day = 0; day < durationDays; day++) {
    for (const { hour, minute } of parsedTimings) {
      const slot = new Date(
        Date.UTC(
          from.getUTCFullYear(),
          from.getUTCMonth(),
          from.getUTCDate() + day,
          hour,
          minute,
          0,
          0
        )
      );
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
