import { createFileRoute, Link } from "@tanstack/react-router";
import { Receipt } from "lucide-react";

import { EmptyState, Screen, ScreenHeader } from "@/components/app/Screen";
import { useOrders } from "@/lib/api";
import { currency, shortId, STATUS_LABEL, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Order history — Ember" },
      { name: "description", content: "Every Ember order you've placed, with status and totals." },
      { property: "og:title", content: "Order history — Ember" },
      { property: "og:description", content: "Track current orders and revisit past ones." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { data: orders } = useOrders();
  const rows = orders ?? [];

  return (
    <Screen>
      <ScreenHeader title="Orders" subtitle="Live and past deliveries" />
      {rows.length === 0 ? (
        <EmptyState
          icon={<Receipt className="size-7" />}
          title="No orders yet"
          body="Once you place an order it appears here with live tracking."
          action={
            <Link
              to="/"
              className="rounded-full ember-gradient px-6 py-3 text-sm font-bold text-primary-foreground"
            >
              Start an order
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((o) => (
            <Link
              key={o.id}
              to="/orders/$id"
              params={{ id: o.id }}
              className="block rounded-3xl bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold">
                  {o.restaurants?.name ?? "Ember order"}
                </span>
                <span className="text-xs text-muted-foreground">{timeAgo(o.created_at)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">#{shortId(o.id)}</p>
              <div className="mt-3 flex items-center justify-between">
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                    o.status === "delivered"
                      ? "bg-elevated text-muted-foreground"
                      : o.status === "cancelled"
                        ? "bg-destructive/20 text-destructive"
                        : "ember-gradient text-primary-foreground"
                  }`}
                >
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
                <span className="font-display text-base font-bold text-primary">
                  {currency(o.total)}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {(o.order_items ?? []).map((i) => `${i.quantity}× ${i.name}`).join(", ")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </Screen>
  );
}
