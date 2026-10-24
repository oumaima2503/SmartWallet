"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import AuthLayout from "@/components/auth/AuthLayout";
import PasswordField from "@/components/auth/PasswordField";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";

type Errors = Partial<Record<"email" | "password" | "form", string>>;

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const newErrors: Errors = {};
    if (!email.trim()) newErrors.email = "Enter your email.";
    if (!password) newErrors.password = "Enter your password.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      // On success the AppShell sends the user to the page they wanted
      await login(email.trim(), password);
    } catch (err) {
      setErrors({ form: (err as Error).message });
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to see your finances."
      footer={
        <>
          New to SmartWallet?{" "}
          <Link href="/register" className="font-semibold text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          error={errors.email}
          autoFocus
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          error={errors.password}
        />

        {errors.form && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {errors.form}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full">
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}
