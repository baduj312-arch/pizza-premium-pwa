import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Receipt, Heart, ShieldCheck } from "lucide-react";

import { Screen, ScreenHeader } from "@/components/app/Screen";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Ember" },
      { name: "description", content: "Update your name, phone and default delivery address." },
      { property: "og:title", content: "Your profile — Ember" },
      { property: "og:description", content: "Manage your Ember account details." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, isAdmin } = useAuth();
  const { data: profile } = useProfile();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setAddress(profile.address ?? "");
  }, [profile]);

  async function save() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: fullName, phone, address });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profile saved");
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <Screen>
      <ScreenHeader title="Your profile" subtitle={user?.email ?? ""} />

      <div className="space-y-3">
        <Field label="Full name" value={fullName} onChange={setFullName} />
        <Field label="Phone" value={phone} onChange={setPhone} />
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Default address</label>
          <textarea
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1.5 w-full resize-none rounded-2xl bg-card px-4 py-3.5 text-sm outline-none"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="w-full rounded-2xl ember-gradient py-4 font-display text-sm font-bold text-primary-foreground shadow-ember disabled:opacity-60"
        >
          Save changes
        </button>
      </div>

      <nav className="mt-7 space-y-3">
        <Tile to="/orders" icon={<Receipt className="size-5" />} label="Order history" />
        <Tile to="/favorites" icon={<Heart className="size-5" />} label="Saved dishes" />
        {isAdmin && (
          <Tile to="/admin" icon={<ShieldCheck className="size-5" />} label="Admin dashboard" />
        )}
      </nav>

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-sm font-semibold text-destructive"
      >
        <LogOut className="size-4" /> Sign out
      </button>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-2xl bg-card px-4 py-3.5 text-sm outline-none"
      />
    </div>
  );
}

function Tile({
  to,
  icon,
  label,
}: {
  to: "/orders" | "/favorites" | "/admin";
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-4">
      <span className="text-primary">{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}
