"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password/update`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">📬</div>
        <p className="text-sm text-light">
          If an account with that email exists, we&apos;ve sent a reset link. Check your inbox.
        </p>
        <a href="/login" className="inline-block mt-4 text-sm text-primary font-medium hover:underline">
          Back to login
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      {error && (
        <p className="text-sm text-danger bg-danger-light rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Sending..." : "Send reset link"}
      </button>

      <p className="text-xs text-center">
        <a href="/login" className="text-light hover:text-dark">
          Back to login
        </a>
      </p>
    </form>
  );
}
