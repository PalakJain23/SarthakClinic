import { z } from "zod";

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value;
  });

export const bookingSchema = z.object({
  patientName: z.string().trim().min(2).max(100),
  mobile: z.string().trim().min(10).max(18),
  sessionId: z.string().uuid(),
  preferredTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional()
    .or(z.literal("")),
  age: z.union([
    z.literal(""),
    z.string().regex(/^\d{1,3}$/).transform(Number).pipe(z.number().int().min(1).max(120)),
  ]).optional(),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
  privacyAcknowledged: z.literal(true),
  idempotencyKey: z.string().uuid(),
}).strict();

export type BookingInput = z.infer<typeof bookingSchema>;

export function normalizeIndianMobile(value: string) {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (!/^(?:\+?91)?[6-9]\d{9}$/.test(compact)) {
    throw new Error("Please enter a valid Indian mobile number.");
  }
  const digits = compact.replace(/^\+?91/, "");
  const local = digits.length === 10 ? digits : compact;
  if (!/^[6-9]\d{9}$/.test(local)) {
    throw new Error("Please enter a valid Indian mobile number.");
  }
  return `+91${local}`;
}
