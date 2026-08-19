/** Strips everything except digits so numbers compare consistently
 * regardless of "+", spaces, or dashes (matches how Meta sends `from`/`wa_id`). */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}
