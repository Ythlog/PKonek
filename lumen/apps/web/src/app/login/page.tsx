import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";
import { AuthLayout, AuthLink } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { CITIZEN_REGISTER, STAFF_LOGIN } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Sign in" };

export default function CitizenLoginPage() {
  return (
    <AuthLayout
      audience="citizen"
      title="Sign in to PKonek"
      description="Follow your reports and get updates from your barangay."
      footer={
        <>
          <p>
            New to PKonek? <AuthLink href={CITIZEN_REGISTER}>Create an account</AuthLink>
          </p>
          <p>
            Barangay or city staff? <AuthLink href={STAFF_LOGIN}>Staff sign in</AuthLink>
          </p>
        </>
      }
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <LoginForm area="citizen" />
      </Suspense>
    </AuthLayout>
  );
}
