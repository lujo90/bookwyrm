import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-dark mb-1">Welcome back</h1>
        <p className="text-sm text-light mb-6">Log in to your FoodComply account</p>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="text-xs text-center text-light mt-4">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="text-primary font-medium hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </main>
  );
}
