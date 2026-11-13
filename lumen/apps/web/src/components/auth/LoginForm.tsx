"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { isApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/AuthProvider";
import { CITIZEN_LOGIN, homePathFor, isStaffRole, safeNextPath } from "@/lib/auth/routes";
import { fieldErrors, loginSchema } from "@/lib/auth/schemas";
import { DemoAccounts } from "./DemoAccounts";
import { PasswordInput } from "./PasswordInput";

type Area = "citizen" | "staff";

type FormError = { title: string; body?: string; action?: { href: string; label: string } };

export function LoginForm({ area }: { area: Area }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { status, role, user, login, logout, endReason, clearEndReason } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<FormError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const submittingRef = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const next = searchParams.get("next");

  // Already signed in when the page opened: go straight to the right area.
  useEffect(() => {
    if (status !== "authenticated" || !role || submittingRef.current) return;
    if (area === "staff" && !isStaffRole(role)) return;
    router.replace(safeNextPath(next, role) ?? homePathFor(role));
  }, [status, role, area, next, router]);

  function validate(values = { email, password }) {
    const found = fieldErrors(loginSchema, values);
    setErrors(found);
    return found;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTriedSubmit(true);
    setFormError(null);
    clearEndReason();
    const found = validate();
    if (found.email) return emailRef.current?.focus();
    if (found.password) return passwordRef.current?.focus();

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const signedIn = await login(email.trim(), password);
      if (area === "staff" && !isStaffRole(signedIn.role)) {
        await logout();
        setFormError({
          title: "This sign-in is for barangay and city staff",
          body: "Your account is a resident account.",
          action: { href: CITIZEN_LOGIN, label: "Go to resident sign-in" },
        });
        return;
      }
      toast.show({ tone: "success", title: `Welcome back, ${signedIn.full_name.split(" ")[0]}` });
      router.replace(safeNextPath(next, signedIn.role) ?? homePathFor(signedIn.role));
    } catch (error) {
      const message = isApiError(error) ? error.message : "Something went wrong. Please try again.";
      setFormError({
        title: isApiError(error) && error.kind === "unauthorized" ? "We couldn't sign you in" : "Sign-in failed",
        body: message,
      });
      setPassword("");
      passwordRef.current?.focus();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const signedInElsewhere = area === "staff" && status === "authenticated" && role === "citizen";

  return (
    <div className="grid gap-4">
      {endReason === "expired" && !formError && (
        <Alert tone="info" title="Your session ended">
          For your security you were signed out after a period of time. Please sign in again.
        </Alert>
      )}
      {endReason === "unauthorized" && !formError && (
        <Alert tone="warning" title="Please sign in again">
          Your session is no longer valid.
        </Alert>
      )}
      {signedInElsewhere && (
        <Alert
          tone="info"
          title={`You're signed in as ${user?.full_name ?? "a resident"}`}
          action={
            <Button size="sm" variant="secondary" onClick={() => logout()}>
              Sign out
            </Button>
          }
        >
          This page is for staff accounts.
        </Alert>
      )}
      {formError && (
        <Alert tone="danger" title={formError.title}>
          {formError.body}
          {formError.action && (
            <>
              {" "}
              <a href={formError.action.href} className="font-semibold text-brand-600 underline underline-offset-4">
                {formError.action.label}
              </a>
            </>
          )}
        </Alert>
      )}

      <form noValidate onSubmit={onSubmit} className="grid gap-4" aria-label={area === "staff" ? "Staff sign in" : "Resident sign in"}>
        <Field label={area === "staff" ? "Work email" : "Email address"} error={errors.email} required>
          <Input
            ref={emailRef}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={area === "staff" ? "name@pasig.gov.ph" : "juan@example.com"}
            leadingIcon={<Mail size={18} strokeWidth={1.75} />}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (triedSubmit) validate({ email: e.target.value, password });
            }}
          />
        </Field>

        <Field
          label="Password"
          error={errors.password}
          required
          helper={area === "staff" ? "Forgot it? Your Pasig administrator can reset it." : undefined}
        >
          <PasswordInput
            ref={passwordRef}
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (triedSubmit) validate({ email, password: e.target.value });
            }}
          />
        </Field>

        <Button type="submit" size="lg" fullWidth loading={submitting} trailingIcon={<ArrowRight aria-hidden size={18} strokeWidth={1.75} />}>
          {submitting ? "Signing in" : "Sign in"}
        </Button>
      </form>

      <DemoAccounts
        roles={area === "staff" ? ["official", "pasig_admin"] : ["citizen"]}
        onPick={(e, p) => {
          setEmail(e);
          setPassword(p);
          setErrors({});
          setFormError(null);
        }}
      />
    </div>
  );
}
