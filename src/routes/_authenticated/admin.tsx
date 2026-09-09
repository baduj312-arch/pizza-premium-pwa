import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Store, UtensilsCrossed, Users, Tag, ShieldAlert } from "lucide-react";

import { Screen, ScreenHeader } from "@/components/app/Screen";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMenuItems, usePromotions, useRestaurants, type Order } from "@/lib/api";
import { ORDER_STATUSES, STATUS_LABEL, currency, shortId, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard | Ember" },
      {
        name: "description",
        content: "Manage Ember restaurants, menus, live orders, customers and promotions.",
      },
      { property: "og:title", content: "Admin dashboard | Ember" },
      {
        property: "og:description",
        content: "Operations console for Ember restaurants, menus, orders and offers.",
      },
    ],
  }),
  component: AdminPage,
});

type Tab = "orders" | "restaurants" | "menu" | "customers" | "promos";

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("orders");

  if (loading) {
    return (
      <Screen>
        <Skeleton className="h-10 w-40 rounded-2xl" />
        <Skeleton className="mt-4 h-40 rounded-3xl" />
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen>
        <ScreenHeader title="Admin" back="/profile" />
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="grid size-16 place-items-center rounded-3xl bg-card text-primary">
            <ShieldAlert className="size-7" />
          </div>
          <h2 className="mt-5 font-display text-lg font-semibold">Admins only</h2>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            This account doesn't have access to the operations console.
          </p>
        </div>
      </Screen>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "orders", label: "Orders" },
    { id: "restaurants", label: "Restaurants" },
    { id: "menu", label: "Menu" },
    { id: "customers", label: "Customers" },
    { id: "promos", label: "Offers" },
  ];

  return (
    <Screen>
      <ScreenHeader title="Operations" subtitle="Manage Ember end to end" back="/profile" />
      <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors " +
              (tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "orders" && <OrdersPanel />}
      {tab === "restaurants" && <RestaurantsPanel />}
      {tab === "menu" && <MenuPanel />}
      {tab === "customers" && <CustomersPanel />}
      {tab === "promos" && <PromosPanel />}
    </Screen>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl bg-card p-4">{children}</div>;
}

function OrdersPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, restaurants(name, slug), order_items(*)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: status as never })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order updated");
      void qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      void qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-40 rounded-3xl" />;
  if (!data?.length) return <Card>No orders yet.</Card>;

  return (
    <div className="space-y-3">
      {data.map((o) => (
        <Card key={o.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">#{shortId(o.id)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {o.restaurants?.name ?? "Ember"} · {timeAgo(o.created_at)}
              </p>
            </div>
            <p className="text-sm font-bold text-primary">{currency(o.total)}</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {o.order_items?.length ?? 0} items · {o.payment_method} · {o.address}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...ORDER_STATUSES, "cancelled"].map((s) => (
              <button
                key={s}
                disabled={setStatus.isPending}
                onClick={() => setStatus.mutate({ id: o.id, status: s })}
                className={
                  "rounded-full px-3 py-1.5 text-xs font-semibold " +
                  (o.status === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground")
                }
              >
                {STATUS_LABEL[s] ?? s}
              </button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function RestaurantsPanel() {
  const { data, isLoading } = useRestaurants();
  if (isLoading) return <Skeleton className="h-40 rounded-3xl" />;
  return (
    <div className="space-y-3">
      {(data ?? []).map((r) => (
        <Card key={r.id}>
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
              <Store className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.cuisine} · {r.rating} ★ ({r.review_count}) · {r.delivery_minutes} min
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {r.is_active ? "Live" : "Paused"}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function MenuPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useMenuItems();

  const toggle = useMutation({
    mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
      const { error } = await supabase.from("menu_items").update({ is_available }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Menu updated");
      void qc.invalidateQueries({ queryKey: ["menu-items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-40 rounded-3xl" />;

  return (
    <div className="space-y-3">
      {(data ?? []).map((m) => (
        <Card key={m.id}>
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
              <UtensilsCrossed className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{m.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {m.restaurants?.name ?? "—"} · {currency(m.price)}
              </p>
            </div>
            <button
              disabled={toggle.isPending}
              onClick={() => toggle.mutate({ id: m.id, is_available: !m.is_available })}
              className={
                "rounded-full px-3 py-1.5 text-xs font-semibold " +
                (m.is_available
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground")
              }
            >
              {m.is_available ? "Available" : "Hidden"}
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function CustomersPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, address")
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <Skeleton className="h-40 rounded-3xl" />;
  if (!data?.length) return <Card>No customers yet.</Card>;

  return (
    <div className="space-y-3">
      {data.map((p) => (
        <Card key={p.id}>
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
              <Users className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{p.full_name ?? "Ember customer"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {p.phone ?? "No phone"} · {p.address ?? "No address"}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function PromosPanel() {
  const { data, isLoading } = usePromotions();
  if (isLoading) return <Skeleton className="h-40 rounded-3xl" />;
  if (!data?.length) return <Card>No offers yet.</Card>;
  return (
    <div className="space-y-3">
      {data.map((p) => (
        <Card key={p.id}>
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
              <Tag className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {p.code} · {p.discount_percent}% off
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              {p.is_active ? "Active" : "Off"}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
