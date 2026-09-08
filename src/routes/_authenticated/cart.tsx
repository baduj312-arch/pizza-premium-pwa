import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { EmptyState, Screen, ScreenHeader } from "@/components/app/Screen";
import { useCart, useCartTotals, useUpdateCartQty } from "@/lib/api";
import { currency, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({
    meta: [
      { title: "Your bag — Ember" },
      { name: "description", content: "Review your Ember bag and head to checkout." },
      { property: "og:title", content: "Your bag — Ember" },
      { property: "og:description", content: "Review your order before checkout on Ember." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { data: cart } = useCart();
  const { subtotal, count } = useCartTotals(cart);
  const updateQty = useUpdateCartQty();
  const deliveryFee = count > 0 ? 2.49 : 0;

  return (
    <Screen>
      <ScreenHeader title="Your bag" subtitle={`${count} item${count === 1 ? "" : "s"}`} />

      {count === 0 && (
        <EmptyState
          icon={<ShoppingBag className="size-7" />}
          title="Your bag is empty"
          body="Add something hot from one of our kitchens and it'll show up here."
          action={
            <Link
              to="/"
              className="rounded-full ember-gradient px-6 py-3 text-sm font-bold text-primary-foreground"
            >
              Browse food
            </Link>
          }
        />
      )}

      <div className="space-y-3">
        {(cart ?? []).map((row) => (
          <div key={row.id} className="flex items-center gap-3 rounded-3xl bg-card p-3">
            <img
              src={row.menu_items?.image_url ?? "/images/pizza-margherita.jpg"}
              alt={row.menu_items?.name ?? "Dish"}
              loading="lazy"
              width={1024}
              height={768}
              className="size-20 rounded-2xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold">{row.menu_items?.name}</h3>
              <p className="text-xs text-muted-foreground">{row.menu_items?.restaurants?.name}</p>
              <p className="mt-1 font-display text-sm font-bold text-primary">
                {currency(num(row.menu_items?.price) * row.quantity)}
              </p>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateQty.mutate({ id: row.id, quantity: row.quantity + 1 })}
                className="grid size-8 place-items-center rounded-full bg-elevated"
                aria-label="Increase quantity"
              >
                <Plus className="size-4" />
              </button>
              <span className="font-display text-sm font-bold">{row.quantity}</span>
              <button
                type="button"
                onClick={() => updateQty.mutate({ id: row.id, quantity: row.quantity - 1 })}
                className="grid size-8 place-items-center rounded-full bg-elevated"
                aria-label="Decrease quantity"
              >
                {row.quantity === 1 ? (
                  <Trash2 className="size-4 text-destructive" />
                ) : (
                  <Minus className="size-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {count > 0 && (
        <>
          <div className="mt-6 space-y-2.5 rounded-3xl bg-card p-5 text-sm">
            <Row label="Subtotal" value={currency(subtotal)} />
            <Row label="Delivery" value={currency(deliveryFee)} />
            <div className="my-2 h-px bg-border" />
            <Row label="Total" value={currency(subtotal + deliveryFee)} strong />
          </div>
          <Link
            to="/checkout"
            className="mt-5 block rounded-2xl ember-gradient py-4 text-center font-display text-sm font-bold text-primary-foreground shadow-ember"
          >
            Go to checkout
          </Link>
        </>
      )}
    </Screen>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "font-display text-base font-bold text-primary" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}
