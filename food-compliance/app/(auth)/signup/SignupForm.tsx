"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function SignupForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // 1. Create auth user
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setError("Failed to create account. Please try again.");
      setLoading(false);
      return;
    }

    // 2. Create org + profile via server route (uses service role)
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, email, fullName, companyName }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Failed to set up your account.");
      setLoading(false);
      return;
    }

    // If email confirmation is required, redirect to verify page
    if (data.user?.identities?.length === 0 || !data.session) {
      router.push("/verify-email");
      return;
    }

    // Otherwise go straight to dashboard
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-dark mb-1">
          Your name
        </label>
        <input
          id="fullName"
          type="text"
          required
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-dark placeholder:text-pale focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="Jane Smith"
        />
      </div>

      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-dark mb-1">
          Company name
        </label>
        <input
          id="companyName"
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-dark placeholder:text-pale focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="Acme Foods Ltd"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-dark mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-dark placeholder:text-pale focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-dark mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2.5 text-sm text-dark placeholder:text-pale focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="Min. 8 characters"
        />
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-light rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
