import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Banknote, Wallet, MessageCircle } from "lucide-react";

import { Screen, ScreenHeader } from "@/components/app/Screen";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart, useCartTotals, useProfile, usePromotions } from "@/lib/api";
import { currency, num } from "@/lib/format";
import { WHATSAPP_NUMBER, whatsappLink } from "@/lib/contact";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Ember" },
      { name: "description", content: "Confirm your delivery address, payment and promo code." },
      { property: "og:title", content: "Checkout — Ember" },
      { property: "og:description", content: "Confirm address, payment and promo code on Ember." },
    ],
  }),
  component: CheckoutPage,
});

const PAYMENTS = [
  { id: "card", label: "Card", icon: CreditCard },
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "wallet", label: "Wallet", icon: Wallet },
] as const;

function CheckoutPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: cart } = useCart();
  const { data: profile } = useProfile();
  const { data: promos } = usePromotions();
  const { subtotal, count } = useCartTotals(cart);

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState<string>("card");
  const [promo, setPromo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.address) setAddress((a) => a || profile.address!);
    if (profile?.phone) setPhone((p) => p || profile.phone!);
  }, [profile]);

  const matched = (promos ?? []).find(
    (p) => p.is_active && p.code.toUpperCase() === promo.trim().toUpperCase(),
  );
  const deliveryFee = count > 0 ? 2.49 : 0;
  const discount = matched ? (subtotal * matched.discount_percent) / 100 : 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  async function placeOrder() {
    if (!user) return;
    if (!address.trim()) {
      toast.error("Add a delivery address");
      return;
    }
    setBusy(true);
    try {
      const restaurantId = cart?.[0]?.menu_items?.restaurant_id ?? null;
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          restaurant_id: restaurantId,
          status: "pending",
          subtotal,
          delivery_fee: deliveryFee,
          discount,
          total,
          address: address.trim(),
          phone: phone.trim() || null,
          payment_method: payment,
          promo_code: matched?.code ?? null,
          courier_name: "Marco D.",
          eta_minutes: 28,
        })
        .select("id")
        .single();
      if (error) throw error;

      const items = (cart ?? []).map((row) => ({
        order_id: order.id,
        menu_item_id: row.menu_item_id,
        name: row.menu_items?.name ?? "Item",
        price: num(row.menu_items?.price),
        quantity: row.quantity,
        image_url: row.menu_items?.image_url ?? null,
      }));
      if (items.length) {
        const { error: itemsError } = await supabase.from("order_items").insert(items);
        if (itemsError) throw itemsError;
      }

      await supabase.from("cart_items").delete().eq("user_id", user.id);
      await qc.invalidateQueries({ queryKey: ["cart"] });
      await qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order placed — tracking it now");
      void navigate({ to: "/orders/$id", params: { id: order.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't place the order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Checkout" subtitle="Almost there" back="/cart" />

      <section className="space-y-3">
        <label className="block text-sm font-semibold">Delivery address</label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          placeholder="Street, apartment, city"
          className="w-full resize-none rounded-2xl bg-card px-4 py-3.5 text-sm outline-none"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          className="w-full rounded-2xl bg-card px-4 py-3.5 text-sm outline-none"
          autoComplete="tel"
        />
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">Payment method</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {PAYMENTS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPayment(id)}
              className={cn(
                "rounded-2xl p-4 text-center text-xs font-semibold",
                payment === id
                  ? "ember-gradient text-primary-foreground shadow-ember"
                  : "bg-card text-muted-foreground",
              )}
            >
              <Icon className="mx-auto mb-2 size-5" />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">Promo code</h2>
        <input
          value={promo}
          onChange={(e) => setPromo(e.target.value)}
          placeholder="e.g. NERO20"
          className="mt-3 w-full rounded-2xl bg-card px-4 py-3.5 text-sm uppercase outline-none"
        />
        {promo && (
          <p className={cn("mt-2 text-xs", matched ? "text-success" : "text-muted-foreground")}>
            {matched ? `${matched.discount_percent}% off applied` : "Code not recognised"}
          </p>
        )}
      </section>

      <section className="mt-6 space-y-2.5 rounded-3xl bg-card p-5 text-sm">
        <Row label={`Items (${count})`} value={currency(subtotal)} />
        <Row label="Delivery" value={currency(deliveryFee)} />
        {discount > 0 && <Row label="Discount" value={`- ${currency(discount)}`} />}
        <div className="my-2 h-px bg-border" />
        <Row label="Total" value={currency(total)} strong />
      </section>

      <button
        type="button"
        disabled={busy || count === 0}
        onClick={() => void placeOrder()}
        className="mt-5 w-full rounded-2xl ember-gradient py-4 font-display text-sm font-bold text-primary-foreground shadow-ember disabled:opacity-50"
      >
        {count === 0 ? "Your bag is empty" : `Place order · ${currency(total)}`}
      </button>

      <a
        href={whatsappLink(
          `Hello Ember! I'd like to order:\n${(cart ?? [])
            .map((row) => `${row.quantity}× ${row.menu_items?.name ?? "Item"}`)
            .join("\n")}\nTotal: ${currency(total)}\nAddress: ${address || "(to confirm)"}`,
        )}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-sm font-semibold"
      >
        <MessageCircle className="size-4 text-success" /> Order on WhatsApp · {WHATSAPP_NUMBER}
      </a>
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
