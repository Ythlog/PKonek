"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, UserRound } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { isApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/AuthProvider";
import { homePathFor } from "@/lib/auth/routes";
import { fieldErrors, registerSchema, type RegisterValues } from "@/lib/auth/schemas";
import { BARANGAY_NAMES } from "@/lib/pasig";
import { PasswordInput } from "./PasswordInput";

const EMPTY: RegisterValues = {
  full_name: "",
  email: "",
  barangay: "",
  contact_number: "",
  password: "",
  confirm_password: "",
  accept_terms: false,
};

const FIELD_ORDER: Array<keyof RegisterValues> = ["full_name", "email", "barangay", "contact_number", "password", "confirm_password", "accept_terms"];

export function RegisterForm() {
  const router = useRouter();
  const toast = useToast();
  const { registerCitizen } = useAuth();
  const [values, setValues] = useState<RegisterValues>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function set<K extends keyof RegisterValues>(key: K, value: RegisterValues[K]) {
    const nextValues = { ...values, [key]: value };
    setValues(nextValues);
    if (triedSubmit) setErrors(fieldErrors(registerSchema, nextValues));
  }

  function focusFirstError(found: Record<string, string>) {
    const first = FIELD_ORDER.find((f) => found[f]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTriedSubmit(true);
    setFormError(null);
    const found = fieldErrors(registerSchema, values);
    setErrors(found);
    if (Object.keys(found).length) return focusFirstError(found);

    const parsed = registerSchema.parse(values);
    setSubmitting(true);
    try {
      const user = await registerCitizen({
        full_name: parsed.full_name,
        email: parsed.email,
        password: parsed.password,
        barangay: parsed.barangay,
        contact_number: parsed.contact_number,
      });
      toast.show({ tone: "success", title: `Welcome to PKonek, ${user.full_name.split(" ")[0]}`, description: "Your account is ready." });
      router.replace(homePathFor(user.role));
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        const found = { email: "An account with this email already exists. Sign in instead." };
        setErrors(found);
        focusFirstError(found);
      } else if (isApiError(error) && Object.keys(error.fieldErrors).length) {
        setErrors(error.fieldErrors);
        focusFirstError(error.fieldErrors);
      } else {
        setFormError(isApiError(error) ? error.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      {formError && (
        <Alert tone="danger" title="We couldn't create your account">
          {formError}
        </Alert>
      )}
      <form ref={formRef} noValidate onSubmit={onSubmit} aria-label="Create a resident account" className="grid gap-5">
        <Field label="Full name" error={errors.full_name} required>
          <Input
            name="full_name"
            autoComplete="name"
            placeholder="Juan dela Cruz"
            leadingIcon={<UserRound size={18} strokeWidth={1.75} />}
            value={values.full_name}
            onChange={(e) => set("full_name", e.target.value)}
          />
        </Field>

        <Field label="Email address" error={errors.email} helper="We'll send status updates here." required>
          <Input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="juan@example.com"
            leadingIcon={<Mail size={18} strokeWidth={1.75} />}
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Barangay" hint="Optional" error={errors.barangay}>
            <Select name="barangay" value={values.barangay} onChange={(e) => set("barangay", e.target.value)}>
              <option value="">Select your barangay</option>
              {BARANGAY_NAMES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mobile number" hint="Optional" error={errors.contact_number}>
            <Input
              name="contact_number"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0917 123 4567"
              leadingIcon={<Phone size={18} strokeWidth={1.75} />}
              value={values.contact_number}
              onChange={(e) => set("contact_number", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Password" helper="At least 8 characters." error={errors.password} required>
          <PasswordInput
            name="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => set("password", e.target.value)}
          />
        </Field>

        <Field label="Confirm password" error={errors.confirm_password} required>
          <PasswordInput
            name="confirm_password"
            autoComplete="new-password"
            value={values.confirm_password}
            onChange={(e) => set("confirm_password", e.target.value)}
          />
        </Field>

        <Checkbox
          name="accept_terms"
          label="I agree that my reports and their locations can be shown publicly"
          description="Your name and contact details are only visible to officials."
          error={errors.accept_terms}
          checked={values.accept_terms}
          onChange={(e) => set("accept_terms", e.target.checked)}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {submitting ? "Creating your account" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
