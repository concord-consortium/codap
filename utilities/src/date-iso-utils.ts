// Regular expression to match ISO 8601 date strings as produced by Date.toISOString.
// Note that this regular expression is more strict than the one used in parseDate (isoDateTimeRE) which supports
// additional formats.
const browserIsoDatePattern = /^([+-]\d{6}|\d{4})-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/

export function isStdISODateString(value: string): boolean {
  return browserIsoDatePattern.test(value)
}

export function getTimeZoneOffsetInMilliseconds(date: Date) {
  return date.getTimezoneOffset() * 60000
}

export function formatStdISODateString(date: Date) {
  // Convert Date to ISO string format. It's a consistent format that can be parsed back into a Date object
  // without losing any information. Also, it's relatively compact and it can be easily recognized as a date string,
  // in contrast to storing the date as a number (e.g. milliseconds since epoch).
  // We subtract the effect of the time-zone offset, so that we're effectively storing an abstract
  // time-zone-less value. The local time zone offset is re-applied on restore, so that for instance,
  // midnight local time is serialized as midnight UTC time and restored as midnight local time,
  // even if it is serialized/deserialized in different time zones.
  return new Date(date.getTime() - getTimeZoneOffsetInMilliseconds(date)).toISOString()
}

export function parseStdISODateString(dateStr: string) {
  // local dates written out as ISO strings are implicitly converted to UTC,
  // so we add back the local time zone information when converting to date.
  const _utcDate = new Date(dateStr)
  return new Date(_utcDate.getTime() + getTimeZoneOffsetInMilliseconds(_utcDate))
}
