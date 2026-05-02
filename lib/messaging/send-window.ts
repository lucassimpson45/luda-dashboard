/**
 * Send-window helpers using Intl (IANA timezones, HH:mm wall times).
 */

export type ZonedParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export function parseWallTime(
  s: string | null | undefined,
  fallback: string
): { hour: number; minute: number } {
  const raw = (s?.trim() || fallback).match(/^(\d{1,2}):(\d{2})$/)
  if (!raw) return { hour: 0, minute: 0 }
  let h = Number(raw[1])
  let m = Number(raw[2])
  if (!Number.isFinite(h) || !Number.isFinite(m)) return { hour: 0, minute: 0 }
  h = Math.min(23, Math.max(0, Math.floor(h)))
  m = Math.min(59, Math.max(0, Math.floor(m)))
  return { hour: h, minute: m }
}

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  })
  const parts = dtf.formatToParts(date)
  const n = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN)
  return {
    year: n('year'),
    month: n('month'),
    day: n('day'),
    hour: n('hour'),
    minute: n('minute'),
    second: n('second'),
  }
}

function wallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const startMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0) - 36 * 3600000
  const endMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0) + 36 * 3600000
  for (let ms = startMs; ms <= endMs; ms += 60000) {
    const d = new Date(ms)
    const p = zonedParts(d, timeZone)
    if (
      p.year === year &&
      p.month === month &&
      p.day === day &&
      p.hour === hour &&
      p.minute === minute
    ) {
      return d
    }
  }
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0))
}

function minutesOfDay(hour: number, minute: number): number {
  return hour * 60 + minute
}

function currentMinutesInZone(now: Date, timeZone: string): number {
  const p = zonedParts(now, timeZone)
  return minutesOfDay(p.hour, p.minute)
}

/** Next calendar date (y,m,d) in `timeZone` strictly after `now`'s local date. */
export function nextCalendarYmdInTz(now: Date, timeZone: string): { year: number; month: number; day: number } {
  const t0 = zonedParts(now, timeZone)
  for (let h = 1; h <= 30; h++) {
    const p = zonedParts(new Date(now.getTime() + h * 3600000), timeZone)
    if (p.year !== t0.year || p.month !== t0.month || p.day !== t0.day) {
      return { year: p.year, month: p.month, day: p.day }
    }
  }
  const p = zonedParts(new Date(now.getTime() + 36 * 3600000), timeZone)
  return { year: p.year, month: p.month, day: p.day }
}

export function isWithinSendWindow(
  now: Date,
  timeZone: string,
  sendWindowStart: string | null | undefined,
  sendWindowEnd: string | null | undefined
): boolean {
  const tz = timeZone.trim() || 'UTC'
  const { hour: sh, minute: sm } = parseWallTime(sendWindowStart, '00:00')
  const { hour: eh, minute: em } = parseWallTime(sendWindowEnd, '23:59')
  const startM = minutesOfDay(sh, sm)
  const endM = minutesOfDay(eh, em)
  const cur = currentMinutesInZone(now, tz)
  if (startM <= endM) {
    return cur >= startM && cur <= endM
  }
  return cur >= startM || cur <= endM
}

/**
 * Next `send_window_start` on the appropriate local calendar day in `timeZone`.
 * Same-day window only (`send_window_start` <= `send_window_end` as clock times):
 * - Before today's start → today at start
 * - After today's end → tomorrow at start
 */
export function nextSendWindowOpenUtc(
  now: Date,
  timeZone: string,
  sendWindowStart: string | null | undefined,
  sendWindowEnd: string | null | undefined
): Date {
  const tz = timeZone.trim() || 'UTC'
  const { hour: sh, minute: sm } = parseWallTime(sendWindowStart, '00:00')
  const { hour: eh, minute: em } = parseWallTime(sendWindowEnd, '23:59')
  const startM = minutesOfDay(sh, sm)
  const endM = minutesOfDay(eh, em)
  const tday = zonedParts(now, tz)
  const curM = currentMinutesInZone(now, tz)

  if (startM <= endM) {
    if (curM < startM) {
      return wallClockToUtc(tday.year, tday.month, tday.day, sh, sm, tz)
    }
    if (curM > endM) {
      const { year, month, day } = nextCalendarYmdInTz(now, tz)
      return wallClockToUtc(year, month, day, sh, sm, tz)
    }
    return wallClockToUtc(tday.year, tday.month, tday.day, sh, sm, tz)
  }

  const inside = curM >= startM || curM <= endM
  if (!inside && curM > endM && curM < startM) {
    return wallClockToUtc(tday.year, tday.month, tday.day, sh, sm, tz)
  }
  if (!inside) {
    const { year, month, day } = nextCalendarYmdInTz(now, tz)
    return wallClockToUtc(year, month, day, sh, sm, tz)
  }
  return wallClockToUtc(tday.year, tday.month, tday.day, sh, sm, tz)
}
