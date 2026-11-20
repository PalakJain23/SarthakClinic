import assert from "node:assert/strict";
import test from "node:test";
import {
  doctorScheduleCoversSession,
  doctorSchema,
} from "../src/lib/doctor-directory-schema.ts";
import {
  getNextSessionEndDelay,
  getNextBookableDoctorSession,
  getNextVisibleDoctorSchedule,
  indiaDateTime,
  isSessionBookableNow,
  type PublishedDoctorSession,
} from "../src/lib/doctor-availability.ts";
const example = {
  id: "a50d5e61-16d5-42ab-a018-d3f5d273982b", fullName: "Test Specialist",
  specialty: "Test specialty", qualifications: "", registrationNumber: "",
  experience: "", doctorType: "Visiting Specialist", consultationFee: "500.50",
  description: "", status: "Active", schedule: { type: "unconfirmed" },
};
test("additional doctor does not need patient/appointment data or invented credentials", () => {
  assert.equal(doctorSchema.safeParse(example).success, true);
});
test("doctor schedules reject invalid dates and reversed times", () => {
  for (const schedule of [
    { type: "specific", date: "2026-02-30", startTime: "10:00", endTime: "11:00" },
    { type: "weekly", days: [], startTime: "10:00", endTime: "11:00" },
    { type: "weekly", days: ["Monday"], startTime: "12:00", endTime: "11:00" },
  ]) assert.equal(doctorSchema.safeParse({ ...example, schedule }).success, false);
  assert.equal(doctorSchema.safeParse({ ...example, schedule: { type: "weekly", days: ["Monday"], startTime: "10:00", endTime: "11:00" } }).success, true);
});
test("only bookable clinic sessions inside an additional doctor's schedule are exposed", () => {
  const weekly = { type: "weekly" as const, days: ["Wednesday" as const], startTime: "10:00", endTime: "13:00" };
  assert.equal(doctorScheduleCoversSession(weekly, "2026-11-25", "10:30:00", "12:30:00"), true);
  assert.equal(doctorScheduleCoversSession(weekly, "2026-11-25", "09:30:00", "12:30:00"), false);
  assert.equal(doctorScheduleCoversSession(weekly, "2026-11-26", "10:30:00", "12:30:00"), false);
  assert.equal(doctorScheduleCoversSession(
    { type: "specific", date: "2026-11-25", startTime: "10:00", endTime: "13:00" },
    "2026-11-25",
    "10:00:00",
    "13:00:00",
  ), true);
  assert.equal(doctorScheduleCoversSession(
    { type: "specific", date: "2026-11-25", startTime: "10:00", endTime: "13:00" },
    "2026-11-26",
    "10:00:00",
    "13:00:00",
  ), false);
});
function dateOffset(date: string, days: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
function session(overrides: Partial<PublishedDoctorSession> = {}): PublishedDoctorSession {
  return {
    id: "session",
    doctorId: example.id,
    date: indiaDateTime(new Date(`${indiaDateTime().date}T12:00:00+05:30`)).date,
    startsAt: "10:00",
    endsAt: "13:00",
    status: "open",
    isSample: false,
    ...overrides,
  };
}
function nextWeekday(date: string, weekday: string) {
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = dateOffset(date, offset);
    if (new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" })
      .format(new Date(`${candidate}T00:00:00Z`)) === weekday) return candidate;
  }
  throw new Error(`Could not find next ${weekday}`);
}
test("bookable sessions reject past dates, ended sessions, blocked/full and samples", () => {
  const now = new Date(`${indiaDateTime().date}T12:00:00+05:30`);
  const today = indiaDateTime(now).date;
  assert.equal(isSessionBookableNow(session({ date: dateOffset(today, -1), endsAt: "23:59" }), now), false);
  assert.equal(isSessionBookableNow(session({ date: today, endsAt: "11:59" }), now), false);
  assert.equal(isSessionBookableNow(session({ date: today, endsAt: "12:00:00" }), now), false);
  assert.equal(isSessionBookableNow(session({ date: today, endsAt: "12:00:01" }), now), true);
  assert.equal(isSessionBookableNow(session({ date: today, endsAt: "13:00" }), now), true);
  assert.equal(isSessionBookableNow(session({ date: dateOffset(today, 1) }), now), true);
  assert.equal(isSessionBookableNow(session({ status: "closed" }), now), false);
  assert.equal(isSessionBookableNow(session({ status: "full" }), now), false);
  assert.equal(isSessionBookableNow(session({ isSample: true }), now), false);
});
test("next-session timer targets the nearest future Asia/Kolkata end time", () => {
  const now = new Date(`${indiaDateTime().date}T12:00:00+05:30`);
  assert.equal(getNextSessionEndDelay([
    session({ date: dateOffset(indiaDateTime(now).date, -1), endsAt: "23:59" }),
    session({ date: indiaDateTime(now).date, endsAt: "12:00" }),
    session({ date: indiaDateTime(now).date, endsAt: "13:00" }),
    session({ date: indiaDateTime(now).date, endsAt: "12:01" }),
  ], now), 60_000);
});
test("specific-date profiles require a future matching published session", () => {
  const now = new Date(`${indiaDateTime().date}T12:00:00+05:30`);
  const today = indiaDateTime(now).date;
  const yesterday = dateOffset(today, -1);
  const tomorrow = dateOffset(today, 1);
  assert.equal(getNextBookableDoctorSession(
    example.id,
    { type: "specific", date: yesterday, startTime: "10:00", endTime: "13:00" },
    [session({ date: yesterday })],
    now,
  ), null);
  const future = session({ date: tomorrow });
  assert.equal(getNextBookableDoctorSession(
    example.id,
    { type: "specific", date: tomorrow, startTime: "10:00", endTime: "13:00" },
    [future],
    now,
  ), future);
});
test("weekly schedules select the next real open matching session", () => {
  const now = new Date(`${indiaDateTime().date}T12:00:00+05:30`);
  const today = indiaDateTime(now).date;
  const nextWednesday = nextWeekday(today, "Wednesday");
  const followingWednesday = dateOffset(nextWednesday, 7);
  const schedule = {
    type: "weekly" as const,
    days: ["Wednesday" as const],
    startTime: "10:00",
    endTime: "13:00",
  };
  const full = session({ id: "full", date: nextWednesday, status: "full" });
  const future = session({ id: "future", date: followingWednesday });
  const otherDay = session({ id: "other-day", date: dateOffset(today, 1) });
  assert.equal(
    getNextBookableDoctorSession(example.id, schedule, [full, otherDay, future], now),
    future,
  );
});
test("saved schedules stay visible independently of matching bookable sessions", () => {
  const now = new Date("2026-11-20T14:25:00.000Z");
  const schedules = [
    { type: "specific" as const, date: "2026-11-20", startTime: "13:00", endTime: "21:00" },
    { type: "specific" as const, date: "2026-11-20", startTime: "19:53", endTime: "20:57" },
  ];
  const savedSessions = [
    session({ date: "2026-11-20", startsAt: "12:48", endsAt: "15:49" }),
    session({ date: "2026-11-20", startsAt: "19:33", endsAt: "22:35" }),
  ];

  for (const schedule of schedules) {
    assert.deepEqual(getNextVisibleDoctorSchedule(schedule, now), {
      date: "2026-11-20",
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    });
    assert.equal(getNextBookableDoctorSession(example.id, schedule, savedSessions, now), null);
  }
});
test("specific saved schedule is visible before start but expires at its exact end", () => {
  const schedule = {
    type: "specific" as const,
    date: "2026-11-20",
    startTime: "20:00",
    endTime: "21:00",
  };
  assert.deepEqual(
    getNextVisibleDoctorSchedule(schedule, new Date("2026-11-20T14:29:00.000Z")),
    { date: "2026-11-20", startTime: "20:00", endTime: "21:00" },
  );
  assert.equal(getNextVisibleDoctorSchedule(schedule, new Date("2026-11-20T15:30:00.000Z")), null);
  assert.equal(getNextVisibleDoctorSchedule(schedule, new Date("2026-11-20T15:31:00.000Z")), null);
});
test("weekly saved schedule keeps its ongoing occurrence and advances after it ends", () => {
  const schedule = {
    type: "weekly" as const,
    days: ["Friday" as const],
    startTime: "19:00",
    endTime: "21:00",
  };
  assert.deepEqual(
    getNextVisibleDoctorSchedule(schedule, new Date("2026-11-20T14:25:00.000Z")),
    { date: "2026-11-20", startTime: "19:00", endTime: "21:00" },
  );
  assert.deepEqual(
    getNextVisibleDoctorSchedule(schedule, new Date("2026-11-20T15:30:00.000Z")),
    { date: "2026-11-27", startTime: "19:00", endTime: "21:00" },
  );
});
test("invalid money, identity and status cannot enter the doctor save action", () => {
  for (const change of [{ consultationFee: "-1" }, { consultationFee: "2.123" }, { experience: "101" }, { fullName: "  " }, { status: "anything" }, { id: "invalid" }]) {
    assert.equal(doctorSchema.safeParse({ ...example, ...change }).success, false);
  }
});
