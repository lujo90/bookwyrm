import type { Metadata } from "next";
import SignupForm from "./SignupForm";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-dark mb-1">Create an account</h1>
        <p className="text-sm text-light mb-6">
          Start managing your EU food compliance today
        </p>
        <SignupForm />
        <p className="text-xs text-center text-light mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-primary font-medium hover:underline">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
