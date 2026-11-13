import type { Metadata } from "next";
import { AuthLayout, AuthLink } from "@/components/auth/AuthLayout";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { CITIZEN_LOGIN } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <AuthLayout
      audience="citizen"
      title="Create your resident account"
      description="It's free. Use it to report issues and track their progress."
      footer={
        <p>
          Already have an account? <AuthLink href={CITIZEN_LOGIN}>Sign in</AuthLink>
        </p>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
