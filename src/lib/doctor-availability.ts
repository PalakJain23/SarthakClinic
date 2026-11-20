import {
  doctorScheduleCoversSession,
  type DoctorSchedule,
} from "./doctor-directory-schema.ts";

export type PublishedDoctorSession = {
  id: string;
  doctorId?: string | null;
  date: string;
  startsAt: string;
  endsAt: string;
  status: string;
  isSample: boolean;
};

export type VisibleDoctorSchedule = {
  date: string;
  startTime: string;
  endTime: string;
};

export function indiaDateTime(now: Date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

function validDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function timeWithSeconds(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(value);
  return match ? `${match[1]}:${match[2]}:${match[3] ?? "00"}` : null;
}

function sessionEndTimestamp(session: Pick<PublishedDoctorSession, "date" | "endsAt">) {
  const endsAt = timeWithSeconds(session.endsAt);
  if (!validDate(session.date) || !endsAt) return null;
  return new Date(`${session.date}T${endsAt}+05:30`).getTime();
}

function dateOffset(date: string, days: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function weekdayForDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function getNextVisibleDoctorSchedule(
  schedule: DoctorSchedule,
  now: Date = new Date(),
): VisibleDoctorSchedule | null {
  if (schedule.type === "unconfirmed") return null;

  const dates = schedule.type === "specific"
    ? [schedule.date]
    : Array.from({ length: 8 }, (_, offset) =>
        dateOffset(indiaDateTime(now).date, offset),
      );
  const today = indiaDateTime(now).date;

  for (const date of dates) {
    if (!validDate(date) || date < today) continue;
    if (
      schedule.type === "weekly" &&
      !schedule.days.includes(weekdayForDate(date) as (typeof schedule.days)[number])
    ) continue;
    const endTime = timeWithSeconds(schedule.endTime);
    if (!endTime) continue;
    const endTimestamp = new Date(`${date}T${endTime}+05:30`).getTime();
    if (endTimestamp > now.getTime()) {
      return { date, startTime: schedule.startTime, endTime: schedule.endTime };
    }
  }
  return null;
}

export function sessionHasNotEnded(
  session: Pick<PublishedDoctorSession, "date" | "endsAt">,
  now: Date = new Date(),
) {
  const endTimestamp = sessionEndTimestamp(session);
  return endTimestamp !== null && endTimestamp > now.getTime();
}

export function getNextSessionEndDelay(
  sessions: readonly Pick<PublishedDoctorSession, "date" | "endsAt">[],
  now: Date = new Date(),
) {
  const nextEnd = sessions.reduce((nearest, session) => {
    const endTimestamp = sessionEndTimestamp(session);
    return endTimestamp !== null && endTimestamp > now.getTime()
      ? Math.min(nearest, endTimestamp)
      : nearest;
  }, Number.POSITIVE_INFINITY);
  return Number.isFinite(nextEnd) ? nextEnd - now.getTime() : null;
}

export function isSessionBookableNow(
  session: PublishedDoctorSession,
  now: Date = new Date(),
) {
  return session.status === "open" && !session.isSample && sessionHasNotEnded(session, now);
}

export function getBookableDoctorSessions<T extends PublishedDoctorSession>(
  doctorId: string,
  schedule: DoctorSchedule,
  sessions: readonly T[],
  now: Date = new Date(),
): T[] {
  return sessions
    .filter((session) =>
      session.doctorId === doctorId &&
      isSessionBookableNow(session, now) &&
      doctorScheduleCoversSession(schedule, session.date, session.startsAt, session.endsAt),
    )
    .sort((left, right) =>
      left.date.localeCompare(right.date) || left.startsAt.localeCompare(right.startsAt),
    );
}

export function getNextBookableDoctorSession<T extends PublishedDoctorSession>(
  doctorId: string,
  schedule: DoctorSchedule,
  sessions: readonly T[],
  now: Date = new Date(),
) {
  return getBookableDoctorSessions(doctorId, schedule, sessions, now)[0] ?? null;
}
