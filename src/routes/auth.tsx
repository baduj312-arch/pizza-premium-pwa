import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Flame } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create an account — Ember" },
      {
        name: "description",
        content: "Sign in to Ember to order, save favorites and track deliveries live.",
      },
      { property: "og:title", content: "Sign in or create an account — Ember" },
      {
        property: "og:description",
        content: "Access your Ember bag, favorites and live order tracking.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/", replace: true });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account");
          return;
        }
        toast.success("Welcome to Ember");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
      void navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-64">
        <img
          src="/images/cover-forno-nero.jpg"
          alt="Wood-fired kitchen"
          width={1280}
          height={720}
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        <div className="absolute inset-x-0 bottom-6 px-6">
          <span className="flex items-center gap-2 font-display text-2xl font-extrabold">
            <Flame className="size-6 text-primary" /> Ember
          </span>
          <p className="mt-1 text-sm text-muted-foreground">
            Premium kitchens. Live tracking. Hot at the door.
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-md px-5 pb-16">
        <div className="mt-4 flex rounded-2xl bg-card p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold ${
                mode === m ? "ember-gradient text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "signup" && (
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-2xl bg-card px-4 py-3.5 text-sm outline-none"
              autoComplete="name"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-2xl bg-card px-4 py-3.5 text-sm outline-none"
            autoComplete="email"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-2xl bg-card px-4 py-3.5 text-sm outline-none"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl ember-gradient py-4 font-display text-sm font-bold text-primary-foreground shadow-ember disabled:opacity-60"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={() => void google()}
          className="w-full rounded-2xl border border-border bg-card py-4 text-sm font-semibold"
        >
          Continue with Google
        </button>
      </main>
    </div>
  );
}
