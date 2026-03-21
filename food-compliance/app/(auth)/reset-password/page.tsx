import type { Metadata } from "next";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-dark mb-1">Reset your password</h1>
        <p className="text-sm text-light mb-6">
          Enter your email and we&apos;ll send you a reset link
        </p>
        <ResetPasswordForm />
      </div>
    </main>
  );
}
