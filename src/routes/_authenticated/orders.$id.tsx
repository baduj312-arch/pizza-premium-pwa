import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Bike, ChefHat, Package, MapPin, Phone } from "lucide-react";

import { Screen, ScreenHeader } from "@/components/app/Screen";
import { supabase } from "@/integrations/supabase/client";
import { useOrder } from "@/lib/api";
import { currency, ORDER_STATUSES, shortId, STATUS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  head: () => ({
    meta: [
      { title: "Track your order — Ember" },
      { name: "description", content: "Follow your Ember delivery live, from kitchen to door." },
      { property: "og:title", content: "Track your order — Ember" },
      { property: "og:description", content: "Live delivery status for your Ember order." },
    ],
  }),
  component: TrackPage,
});

const ICONS = [Check, ChefHat, Package, Bike, MapPin];

function TrackPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: order } = useOrder(id);

  // Live updates pushed from the backend.
  useEffect(() => {
    const channel = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["order", id] });
          void qc.invalidateQueries({ queryKey: ["orders"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, qc]);

  // Demo kitchen: advance the order through its stages so tracking is live.
  const status = order?.status;
  useEffect(() => {
    if (!status) return;
    const index = ORDER_STATUSES.indexOf(status as (typeof ORDER_STATUSES)[number]);
    if (index < 0 || index >= ORDER_STATUSES.length - 1) return;
    const next = ORDER_STATUSES[index + 1]!;
    const timer = setTimeout(() => {
      void supabase.from("orders").update({ status: next }).eq("id", id);
    }, 20000);
    return () => clearTimeout(timer);
  }, [status, id]);

  const currentIndex = order
    ? ORDER_STATUSES.indexOf(order.status as (typeof ORDER_STATUSES)[number])
    : -1;

  return (
    <Screen>
      <ScreenHeader
        title="Live tracking"
        subtitle={order ? `#${shortId(order.id)} · ${order.restaurants?.name ?? "Ember"}` : "Loading"}
        back="/orders"
      />

      {order && (
        <>
          <div className="rounded-3xl bg-card p-5 shadow-panel">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Arriving in</p>
            <p className="mt-1 font-display text-4xl font-extrabold text-primary">
              {order.status === "delivered" ? "Delivered" : `${order.eta_minutes} min`}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {STATUS_LABEL[order.status] ?? order.status}
            </p>
          </div>

          <ol className="mt-6 space-y-1">
            {ORDER_STATUSES.map((s, i) => {
              const Icon = ICONS[i]!;
              const done = currentIndex >= i;
              return (
                <li key={s} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "grid size-10 place-items-center rounded-full",
                        done ? "ember-gradient text-primary-foreground" : "bg-card text-muted-foreground",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    {i < ORDER_STATUSES.length - 1 && (
                      <span
                        className={cn(
                          "my-1 w-0.5 flex-1",
                          currentIndex > i ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                  </div>
                  <div className="pb-6 pt-2">
                    <p className={cn("text-sm font-semibold", !done && "text-muted-foreground")}>
                      {STATUS_LABEL[s]}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="rounded-3xl bg-card p-5">
            <h2 className="font-display text-base font-bold">Courier</h2>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-elevated text-primary">
                <Bike className="size-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{order.courier_name ?? "Assigning…"}</p>
                <p className="text-xs text-muted-foreground">Ember delivery partner</p>
              </div>
              <span className="grid size-10 place-items-center rounded-full bg-elevated text-primary">
                <Phone className="size-4" />
              </span>
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
              {order.address}
            </p>
          </div>

          <div className="mt-4 space-y-3 rounded-3xl bg-card p-5">
            <h2 className="font-display text-base font-bold">Order summary</h2>
            {(order.order_items ?? []).map((i) => (
              <div key={i.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {i.quantity}× {i.name}
                </span>
                <span className="font-medium">{currency(Number(i.price) * i.quantity)}</span>
              </div>
            ))}
            <div className="my-2 h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Total paid</span>
              <span className="font-display text-base font-bold text-primary">
                {currency(order.total)}
              </span>
            </div>
          </div>
        </>
      )}
    </Screen>
  );
}
