const GROUND_TIMEZONE = 'Asia/Kolkata'

/**
 * Ground-local (Asia/Kolkata) calendar date for any Date/instant — matches
 * the backend's own groundDateStr()/groundTodayDateStr(), which every
 * date-scoped booking endpoint validates against. A device-local calendar
 * date (Date#toISOString / Date#setHours + toISOString) drifts from this
 * whenever the device's timezone differs from IST, which silently sends the
 * wrong day to the API.
 */
export function toGroundDateStr(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: GROUND_TIMEZONE }).format(date)
}

export function groundTodayDateStr(): string {
  return toGroundDateStr(new Date())
}
