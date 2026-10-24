"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import AuthLayout from "@/components/auth/AuthLayout";
import PasswordField from "@/components/auth/PasswordField";
import Field from "@/components/ui/Field";
import Button from "@/components/ui/Button";

type Errors = Partial<Record<"name" | "email" | "password" | "confirm" | "form", string>>;

// Same rules as the backend (8 characters min, bcrypt limit of 72 bytes)
function passwordError(password: string) {
  if (password.length < 8) return "Use at least 8 characters.";
  if (new TextEncoder().encode(password).length > 72) return "This password is too long.";
  return undefined;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const newErrors: Errors = {};
    if (!name.trim()) newErrors.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.email = "Enter a valid email.";
    const passwordProblem = passwordError(password);
    if (passwordProblem) newErrors.password = passwordProblem;
    else if (confirm !== password) newErrors.confirm = "The passwords don't match.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      setErrors({ form: (err as Error).message });
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking your money in a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field
          label="Name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          error={errors.name}
          autoFocus
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          error={errors.email}
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          error={errors.password}
          hint="At least 8 characters."
        />
        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          error={errors.confirm}
        />

        {errors.form && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {errors.form}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
