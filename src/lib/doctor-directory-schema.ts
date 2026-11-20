import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});
const weekday = z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
const schedule = z.discriminatedUnion("type", [
  z.object({ type: z.literal("unconfirmed") }),
  z.object({ type: z.literal("weekly"), days: z.array(weekday).min(1).max(7), startTime: time, endTime: time }),
  z.object({ type: z.literal("specific"), date, startTime: time, endTime: time }),
]).refine((value) => value.type === "unconfirmed" || value.endTime > value.startTime, "End time must follow start time");
export const doctorScheduleSchema = schedule;

export const doctorSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(1).max(120),
  specialty: z.string().trim().min(1).max(120),
  qualifications: z.string().trim().max(300),
  registrationNumber: z.string().trim().max(120),
  experience: z.string().regex(/^(?:|\d{1,3})$/).refine((v) => v === "" || Number(v) <= 100),
  doctorType: z.enum(["Regular", "Visiting Specialist"]),
  consultationFee: z.string().regex(/^(?:|\d{1,8}(?:\.\d{1,2})?)$/),
  description: z.string().trim().max(500),
  schedule,
  status: z.enum(["Active", "Inactive"]),
  photoUrl: z.string().url().nullable().optional(),
});
export type Doctor = z.infer<typeof doctorSchema>;
export type DoctorDetails = Omit<Doctor, "id">;
export type DoctorSchedule = Doctor["schedule"];
export type Weekday = z.infer<typeof weekday>;

export function doctorScheduleCoversSession(
  value: DoctorSchedule,
  dateValue: string,
  startsAt: string,
  endsAt: string,
): boolean {
  if (value.type === "unconfirmed") return false;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const startMatch = /^([01]\d|2[0-3]):[0-5]\d/.test(startsAt);
  const endMatch = /^([01]\d|2[0-3]):[0-5]\d/.test(endsAt);
  if (!dateMatch || !startMatch || !endMatch || endsAt <= startsAt) return false;
  const date = new Date(`${dateValue}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateValue) return false;

  if (value.type === "specific" && value.date !== dateValue) return false;
  if (value.type === "weekly") {
    const weekday = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "UTC",
    }).format(date) as Weekday;
    if (!value.days.includes(weekday)) return false;
  }
  return startsAt.slice(0, 5) >= value.startTime && endsAt.slice(0, 5) <= value.endTime;
}
