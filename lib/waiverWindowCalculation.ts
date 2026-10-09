export const WAIVER_TIMEZONE = 'America/Chicago'

const LOCK_HOURS_BEFORE_KICKOFF = 2
const EARLY_KICKOFF_HOUR_THRESHOLD = 9 // 9 am central is the cutoff, earlier starts close the evening before.
const EARLY_CLOSE_HOUR = 17 // 5pm central previous day.

function getZonedParts(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    }).formatToParts(date)

    const get = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find(p => p.type === type)!.value)

    return {
        year: get('year'),
        month: get('month'),
        day: get('day'),
        hour: get('hour'),
        minute: get('minute'),
        second: get('second'),
    }
}

function getTimeZoneOffsetMs(timestamp: number, timeZone: string): number {
    const p = getZonedParts(new Date(timestamp), timeZone)
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
    return asUtc - Math.floor(timestamp / 1000) * 1000
}

function zonedWallTimeToUtc(
    year: number, month: number, day: number, hour: number, timeZone: string
): Date {
    const wallAsUtc = Date.UTC(year, month - 1, day, hour)
    const firstPass = wallAsUtc - getTimeZoneOffsetMs(wallAsUtc, timeZone)
    const secondPass = wallAsUtc - getTimeZoneOffsetMs(firstPass, timeZone)
    return new Date(secondPass)
}

/**
 * Given a fixture's kickoff time, computes when the waiver window closes.
 * Normal case: 2 hours before kickoff
 * Early kickoff (before 10am): closes at 5pm the previous evening instead,
 * since a 2 hour before cutoff. on an early kickoff leaves too small a window in
 * waking hours to set a lineup.
 * 
 * All wall-clock logic is done in WAIVER_TIMEZONE, never the server's local timezone
 * (Vercel runs in UTC)
 */
export function calculateWaiverCloseTime(kickoff: Date): Date {
    const local = getZonedParts(kickoff, WAIVER_TIMEZONE)

    if (local.hour < EARLY_KICKOFF_HOUR_THRESHOLD) {
        return zonedWallTimeToUtc(
            local.year, local.month, local.day - 1, EARLY_CLOSE_HOUR, WAIVER_TIMEZONE
        )
    }

    return new Date(kickoff.getTime() - LOCK_HOURS_BEFORE_KICKOFF * 60 * 60 * 1000)
}