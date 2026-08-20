import { buildReminderSchedule } from "../src/lib/reminders/schedule.ts";

const from = new Date("2026-08-20T05:00:00Z");
const slots = buildReminderSchedule(["08:00", "14:00", "20:00"], 5, from);
console.log("count:", slots.length);
console.log(slots.map((d) => d.toISOString()).join("\n"));

console.log("\n-- edge case: no timings --");
console.log(buildReminderSchedule(null, 5, from).length);

console.log("\n-- edge case: approved late in the day, one slot already passed --");
const late = new Date("2026-08-20T15:00:00Z");
const lateSlots = buildReminderSchedule(["08:00", "14:00", "20:00"], 2, late);
console.log(lateSlots.map((d) => d.toISOString()).join("\n"));
