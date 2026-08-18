import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
      }
      navigate({ to: "/admin" });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-5 py-12">
      <div className="w-full max-w-sm border border-neutral-300 bg-white p-7 shadow-sm">
        <Link to="/" className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 hover:text-neutral-900">
          {"\u2190"} Back to document
        </Link>
        <h1 className="mt-4 text-[22px] font-medium tracking-tight text-neutral-900">
          Admin {mode === "signin" ? "Sign In" : "Sign Up"}
        </h1>
        <p className="mt-1 text-[13px] text-neutral-500">
          Restricted access. Participation registry.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border border-neutral-300 px-3 py-2 text-[14px] outline-none focus:border-neutral-900" />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Password</span>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full border border-neutral-300 px-3 py-2 text-[14px] outline-none focus:border-neutral-900" />
          </label>

          {err && <p className="text-[12px] text-red-700">{err}</p>}

          <button type="submit" disabled={busy} className="w-full bg-neutral-900 px-4 py-2.5 text-[13px] uppercase tracking-[0.18em] text-white hover:bg-neutral-700 disabled:opacity-50">
            {busy ? "..." : mode === "signin" ? "Sign In" : "Create account"}
          </button>
        </form>

        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-5 w-full text-[12px] text-neutral-500 hover:text-neutral-900">
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
