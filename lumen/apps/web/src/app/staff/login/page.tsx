import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";
import { AuthLayout, AuthLink } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { CITIZEN_LOGIN } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Staff sign in" };

export default function StaffLoginPage() {
  return (
    <AuthLayout
      audience="staff"
      title="Staff sign in"
      description="For barangay officials and Pasig City administrators."
      footer={
        <>
          <p>Staff accounts are created by your Pasig administrator.</p>
          <p>
            Pasig resident? <AuthLink href={CITIZEN_LOGIN}>Sign in here</AuthLink>
          </p>
        </>
      }
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <LoginForm area="staff" />
      </Suspense>
    </AuthLayout>
  );
}
