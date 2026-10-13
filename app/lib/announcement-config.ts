// Runtime announcement & maintenance configuration for the landing site.
//
// The source of truth is the CyfrOne admin, which publishes a static
// `/announcement.json` document to the landing CDN. The landing app fetches it
// at runtime (see AnnouncementProvider) — no rebuild is needed to change it.
// This module defines the schema, safe defaults, and the pure helpers shared by
// the banner and the maintenance gate.
//
// Window model: a maintenance window is a **dated** occurrence (start + end
// date-and-time in `sourceTimeZone`). A one-time window auto-expires for good
// after its end. `repeat` makes it a daily window that recurs until
// `repeatUntil` (inclusive), then stops. `paused` hides the banner without
// discarding the config.

export type AnnouncementSeverity = 'info' | 'warning';
export type MaintenancePageMode = 'off' | 'manual' | 'window';

export interface AnnouncementSchedule {
  /** IANA timezone the start/end wall-clock times are expressed in. */
  sourceTimeZone: string;
  /** "YYYY-MM-DD" — the day the window starts (one-time) or first recurs. */
  startDate: string;
  /** "HH:MM" 24h. */
  startTime: string;
  /** "YYYY-MM-DD" — the day the window ends (one-time). */
  endDate: string;
  /** "HH:MM" 24h. */
  endTime: string;
  /** How many minutes before start the "imminent" warning shows. */
  warningMinutes: number;
  /** When true, the window recurs daily (startTime–endTime) through repeatUntil. */
  repeat: boolean;
  /** "YYYY-MM-DD" — last day a repeating window fires (inclusive). */
  repeatUntil: string;
}

export interface AnnouncementConfig {
  version: number;
  announcement: {
    enabled: boolean;
    /** Temporarily hide the banner without turning the announcement off. */
    paused: boolean;
    /** Persistent banner with no schedule (stays up until turned off). */
    fullTime: boolean;
    title: string;
    message: string;
    severity: AnnouncementSeverity;
    schedule: AnnouncementSchedule;
  };
  maintenancePage: {
    /** off = never, manual = always on, window = auto-live during the schedule. */
    mode: MaintenancePageMode;
    title: string;
    message: string;
  };
  publishedAt?: string;
}

export const DEFAULT_ANNOUNCEMENT_CONFIG: AnnouncementConfig = {
  version: 1,
  announcement: {
    enabled: false,
    paused: false,
    fullTime: false,
    title: 'Scheduled Maintenance',
    message: 'CyfroSec will undergo scheduled maintenance.',
    severity: 'info',
    schedule: {
      sourceTimeZone: 'Europe/Warsaw',
      startDate: '',
      startTime: '03:00',
      endDate: '',
      endTime: '05:00',
      warningMinutes: 30,
      repeat: false,
      repeatUntil: '',
    },
  },
  maintenancePage: {
    mode: 'off',
    title: 'Currently under maintenance',
    message: 'We are performing scheduled maintenance.\nPlease check back later.',
  },
};

// ─── Timezone helpers (no external library) ──────────────────────────────────

/** "YYYY-MM-DD" for the given instant, in the given timezone. */
export function dateInTimeZone(nowMs: number, tz: string): string {
  // 'sv' (Swedish) locale formats as ISO YYYY-MM-DD.
  return new Intl.DateTimeFormat('sv', { timeZone: tz }).format(new Date(nowMs));
}

/** Convert a wall-clock date/time in `tz` into the corresponding UTC Date. */
export function zonedTimeToUtc(date: string, time: string, tz: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
      .formatToParts(guess)
      .reduce<Record<string, number>>((acc, p) => {
        if (p.type !== 'literal') acc[p.type] = Number(p.value);
        return acc;
      }, {});
    const h = parts.hour === 24 ? 0 : parts.hour;
    const desired = Date.UTC(year, month - 1, day, hour, minute);
    const actual = Date.UTC(parts.year, parts.month - 1, parts.day, h, parts.minute);
    guess = new Date(guess.getTime() - (actual - desired));
  }
  return guess;
}

/**
 * Resolve the maintenance window that is currently in progress or still ahead,
 * or `null` when there is none (a one-time window that has ended, or a repeat
 * that is past `repeatUntil`). This is the core of the auto-expiry fix: once a
 * window is over and won't recur, the banner has nothing to show.
 */
export function resolveAnnouncementWindow(
  schedule: AnnouncementSchedule,
  now: number = Date.now(),
): { start: Date; end: Date } | null {
  const tz = schedule.sourceTimeZone;
  const startDate = schedule.startDate || dateInTimeZone(now, tz);

  if (!schedule.repeat) {
    const endDate = schedule.endDate || startDate;
    const start = zonedTimeToUtc(startDate, schedule.startTime, tz);
    const end = zonedTimeToUtc(endDate, schedule.endTime, tz);
    if (now >= end.getTime()) return null; // one-time window is over — gone for good
    return { start, end };
  }

  // Repeat: a daily window from startDate through repeatUntil (inclusive).
  const until = schedule.repeatUntil || schedule.endDate || startDate;
  for (let offset = 0; offset <= 1; offset++) {
    const dateStr = dateInTimeZone(now + offset * 86_400_000, tz);
    if (dateStr > until) return null; // past the repeat end — gone
    if (dateStr < startDate) continue; // before the window begins — check next day
    const start = zonedTimeToUtc(dateStr, schedule.startTime, tz);
    const end = zonedTimeToUtc(dateStr, schedule.endTime, tz);
    if (now < end.getTime()) return { start, end }; // today's not over yet, or it's upcoming
  }
  return null;
}

/** True when the resolved maintenance window is currently in progress. */
export function isScheduleActive(schedule: AnnouncementSchedule, now: number = Date.now()): boolean {
  const window = resolveAnnouncementWindow(schedule, now);
  return window !== null && now >= window.start.getTime() && now < window.end.getTime();
}

/** Should the full-page maintenance screen be shown right now? */
export function isMaintenancePageActive(config: AnnouncementConfig, now: number = Date.now()): boolean {
  const { mode } = config.maintenancePage;
  if (mode === 'manual') return true;
  if (mode === 'window') {
    const ann = config.announcement;
    return ann.enabled && !ann.paused && isScheduleActive(ann.schedule, now);
  }
  return false;
}

// ─── Runtime normalization ───────────────────────────────────────────────────

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}
function optStr(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * Coerce an untrusted parsed JSON document into a well-formed AnnouncementConfig
 * by merging it over the defaults. Never throws. Tolerates legacy documents
 * that predate the dated-window fields (they default to empty → treated as a
 * one-time window for the current day, which then expires normally).
 */
export function normalizeConfig(raw: unknown): AnnouncementConfig {
  const d = DEFAULT_ANNOUNCEMENT_CONFIG;
  if (typeof raw !== 'object' || raw === null) return d;
  const r = raw as Record<string, unknown>;
  const a = (r.announcement ?? {}) as Record<string, unknown>;
  const sched = (a.schedule ?? {}) as Record<string, unknown>;
  const mp = (r.maintenancePage ?? {}) as Record<string, unknown>;

  const severity: AnnouncementSeverity = a.severity === 'warning' ? 'warning' : 'info';
  const mode: MaintenancePageMode =
    mp.mode === 'manual' || mp.mode === 'window' ? mp.mode : 'off';

  return {
    version: num(r.version, d.version),
    announcement: {
      enabled: bool(a.enabled, d.announcement.enabled),
      paused: bool(a.paused, d.announcement.paused),
      fullTime: bool(a.fullTime, d.announcement.fullTime),
      title: str(a.title, d.announcement.title),
      message: str(a.message, d.announcement.message),
      severity,
      schedule: {
        sourceTimeZone: str(sched.sourceTimeZone, d.announcement.schedule.sourceTimeZone),
        startDate: optStr(sched.startDate),
        startTime: str(sched.startTime, d.announcement.schedule.startTime),
        endDate: optStr(sched.endDate),
        endTime: str(sched.endTime, d.announcement.schedule.endTime),
        warningMinutes: num(sched.warningMinutes, d.announcement.schedule.warningMinutes),
        repeat: bool(sched.repeat, d.announcement.schedule.repeat),
        repeatUntil: optStr(sched.repeatUntil),
      },
    },
    maintenancePage: {
      mode,
      title: str(mp.title, d.maintenancePage.title),
      message: str(mp.message, d.maintenancePage.message),
    },
    publishedAt: typeof r.publishedAt === 'string' ? r.publishedAt : undefined,
  };
}
