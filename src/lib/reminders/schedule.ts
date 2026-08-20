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
    .map((t) => {
      const match = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
      if (!match) return null;
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      if (hour > 23 || minute > 59) return null;
      return { hour, minute };
    })
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
