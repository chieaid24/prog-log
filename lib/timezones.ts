/** True when the string is an IANA timezone this runtime can resolve. */
export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** All IANA timezones the runtime knows, for the settings picker. */
export function listTimeZones(): string[] {
  return Intl.supportedValuesOf("timeZone");
}
