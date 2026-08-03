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

export type TimeZoneOption = {
  id: string;
  label: string;
};

const CURATED_TIME_ZONES: readonly TimeZoneOption[] = [
  { id: "Pacific/Pago_Pago", label: "(UTC-11:00) Samoa - Pago Pago" },
  { id: "Pacific/Honolulu", label: "(UTC-10:00) Hawaii - Honolulu" },
  { id: "America/Anchorage", label: "(UTC-09:00) Alaska - Anchorage" },
  { id: "America/Los_Angeles", label: "(UTC-08:00) Pacific - Seattle" },
  { id: "America/Denver", label: "(UTC-07:00) Mountain - Denver" },
  { id: "America/Chicago", label: "(UTC-06:00) Central - Chicago" },
  { id: "America/Toronto", label: "(UTC-05:00) Eastern - Toronto" },
  { id: "America/Halifax", label: "(UTC-04:00) Atlantic - Halifax" },
  { id: "America/Sao_Paulo", label: "(UTC-03:00) Brazil - Sao Paulo" },
  { id: "America/Noronha", label: "(UTC-02:00) Brazil - Fernando de Noronha" },
  { id: "Atlantic/Azores", label: "(UTC-01:00) Azores - Ponta Delgada" },
  { id: "Europe/London", label: "(UTC+00:00) UK - London" },
  { id: "Europe/Berlin", label: "(UTC+01:00) Central Europe - Berlin" },
  { id: "Africa/Johannesburg", label: "(UTC+02:00) South Africa - Johannesburg" },
  { id: "Europe/Istanbul", label: "(UTC+03:00) Turkey - Istanbul" },
  { id: "Asia/Dubai", label: "(UTC+04:00) Gulf - Dubai" },
  { id: "Asia/Karachi", label: "(UTC+05:00) Pakistan - Karachi" },
  { id: "Asia/Dhaka", label: "(UTC+06:00) Bangladesh - Dhaka" },
  { id: "Asia/Bangkok", label: "(UTC+07:00) Indochina - Bangkok" },
  { id: "Asia/Singapore", label: "(UTC+08:00) Singapore - Singapore" },
  { id: "Asia/Tokyo", label: "(UTC+09:00) Japan - Tokyo" },
  { id: "Australia/Brisbane", label: "(UTC+10:00) Eastern Australia - Brisbane" },
  { id: "Pacific/Noumea", label: "(UTC+11:00) New Caledonia - Noumea" },
  { id: "Pacific/Auckland", label: "(UTC+12:00) New Zealand - Auckland" },
  { id: "Pacific/Tongatapu", label: "(UTC+13:00) Tonga - Nuku'alofa" },
];

/** Curated IANA timezones shown in settings. */
export function listTimeZones(): TimeZoneOption[] {
  return [...CURATED_TIME_ZONES];
}
