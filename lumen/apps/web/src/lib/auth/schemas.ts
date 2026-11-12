import { z } from "zod";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const email = z
  .string()
  .trim()
  .min(1, { error: "Enter your email address." })
  .max(255, { error: "That email is too long." })
  .regex(EMAIL_PATTERN, { error: "Enter a valid email, like juan@example.com." });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Enter your password." }),
});

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(1, { error: "Enter your full name." }).max(150, { error: "Use 150 characters or fewer." }),
    email,
    barangay: optionalText(100),
    contact_number: z
      .string()
      .trim()
      .refine((v) => v === "" || /^(\+63|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}$/.test(v), {
        error: "Enter a mobile number like 0917 123 4567.",
      })
      .transform((v) => (v === "" ? null : v)),
    password: z
      .string()
      .min(8, { error: "Use at least 8 characters." })
      // bcrypt in the backend reads at most 72 bytes.
      .refine((v) => new TextEncoder().encode(v).length <= 72, { error: "That password is too long." }),
    confirm_password: z.string(),
    accept_terms: z.boolean().refine((v) => v, { error: "Please agree to continue." }),
  })
  .refine((v) => v.password === v.confirm_password, {
    path: ["confirm_password"],
    error: "The passwords don't match.",
  });

export type LoginValues = z.input<typeof loginSchema>;
export type RegisterValues = z.input<typeof registerSchema>;

/** First error per field, for showing under each input. */
export function fieldErrors(schema: z.ZodType, values: unknown): Record<string, string> {
  const result = schema.safeParse(values);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
