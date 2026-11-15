"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="card">Loading...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

const handleSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  setError(null);
  setLoading(true);

  const supabase = supabaseBrowser();
  if (!supabase) {
    setError("Supabase env vars are missing. Check .env.local.");
    setLoading(false);
    return;
  }

  const { data, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password
    });

  if (signInError) {
    setError(signInError.message);
    setLoading(false);
    return;
  }

  // The database decides who is an admin (public.shop_admins), so this check
  // can't be bypassed by calling the API directly. Here we just give a clear message.
  const { data: isAdmin } = await supabase.rpc("is_shop_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    setError(`${data.user?.email ?? "This account"} isn't an admin for this shop. Add it to the shop_admins table (see the README).`);
    setLoading(false);
    return;
  }

  router.replace(redirectedFrom);
};

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="card">
        <h1 className="font-display text-2xl">Admin login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in with your Supabase admin email and password.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <label className="label" htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="label" htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
