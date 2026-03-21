import type { Metadata } from "next";
import UpdatePasswordForm from "./UpdatePasswordForm";

export const metadata: Metadata = { title: "Set new password" };

export default function UpdatePasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-dark mb-1">Set new password</h1>
        <p className="text-sm text-light mb-6">
          Choose a new password for your account
        </p>
        <UpdatePasswordForm />
      </div>
    </main>
  );
}
