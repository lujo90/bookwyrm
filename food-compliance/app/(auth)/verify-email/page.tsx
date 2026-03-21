import type { Metadata } from "next";

export const metadata: Metadata = { title: "Verify email" };

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm border border-slate-100 text-center">
        <div className="text-4xl mb-4">📬</div>
        <h1 className="text-2xl font-bold text-dark mb-2">Check your inbox</h1>
        <p className="text-sm text-light mb-4">
          We&apos;ve sent you a verification link. Click it to activate your account.
        </p>
        <p className="text-xs text-light">
          Didn&apos;t get the email? Check your spam folder or{" "}
          <a href="/signup" className="text-primary font-medium hover:underline">
            try again
          </a>.
        </p>
      </div>
    </main>
  );
}
