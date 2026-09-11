import { Link } from "@tanstack/react-router";
import { Bike, Search, ShoppingBag, Receipt, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { useCart, useCartTotals } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { to: "/", label: "Delivery", icon: Bike },
  { to: "/search", label: "Search", icon: Search },
  { to: "/cart", label: "Cart", icon: ShoppingBag },
  { to: "/orders", label: "Orders", icon: Receipt },
  { to: "/profile", label: "Profile", icon: User },
] as const;


export function BottomNav() {
  const { user } = useAuth();
  const { data: cart } = useCart();
  const { count } = useCartTotals(cart);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border glass-panel safe-bottom">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 pt-2">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="group flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
              activeOptions={{ exact: to === "/" }}
            >
              <span className="relative">
                <Icon className="size-6" strokeWidth={2} />
                {to === "/cart" && user && count > 0 && (
                  <span className="absolute -right-2 -top-1.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </span>
              <span className={cn("text-[11px] font-medium")}>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
