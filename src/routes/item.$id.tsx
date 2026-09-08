import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Heart, Minus, Plus, Flame } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  useAddToCart,
  useFavorites,
  useMenuItem,
  useToggleFavorite,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { currency, num } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/item/$id")({
  head: () => ({
    meta: [
      { title: "Dish details — Ember" },
      {
        name: "description",
        content: "See ingredients, calories and price, then add the dish to your Ember bag.",
      },
      { property: "og:title", content: "Dish details — Ember" },
      {
        property: "og:description",
        content: "Ingredients, calories and one-tap ordering on Ember.",
      },
    ],
  }),
  component: ItemPage,
});

function ItemPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [qty, setQty] = useState(1);
  const { data: item, isLoading } = useMenuItem(id);
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const addToCart = useAddToCart();

  const isFav = !!favorites?.some((f) => f.menu_item_id === id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-5">
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="mt-4 h-32 rounded-3xl" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-xl font-bold">Dish not found</h1>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-80">
        <img
          src={item.image_url ?? "/images/pizza-margherita.jpg"}
          alt={item.name}
          width={1024}
          height={768}
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="absolute left-5 top-6 grid size-10 place-items-center rounded-full bg-background/70 backdrop-blur"
          aria-label="Go back"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() =>
            user
              ? toggleFavorite.mutate({ menuItemId: item.id, isFav })
              : navigate({ to: "/auth" })
          }
          className="absolute right-5 top-6 grid size-10 place-items-center rounded-full bg-background/70 backdrop-blur"
          aria-label="Save to favorites"
        >
          <Heart className={cn("size-5", isFav && "fill-primary text-primary")} />
        </button>
      </div>

      <main className="mx-auto -mt-10 max-w-md px-5 pb-40">
        <div className="rounded-3xl bg-card p-5 shadow-panel">
          {item.is_popular && (
            <span className="inline-flex items-center gap-1.5 rounded-full ember-gradient px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              <Flame className="size-3" /> Crowd favorite
            </span>
          )}
          <h1 className="mt-3 font-display text-2xl font-bold">{item.name}</h1>
          {item.restaurants && (
            <Link
              to="/restaurant/$slug"
              params={{ slug: item.restaurants.slug }}
              className="mt-1 inline-block text-sm font-semibold text-primary"
            >
              {item.restaurants.name}
            </Link>
          )}
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          <div className="mt-4 flex gap-2 text-xs">
            {item.calories && (
              <span className="rounded-full bg-elevated px-3 py-1.5">{item.calories} kcal</span>
            )}
            <span className="rounded-full bg-elevated px-3 py-1.5">
              {item.is_available ? "Available now" : "Sold out"}
            </span>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Quantity</span>
            <div className="flex items-center gap-4 rounded-full bg-elevated px-2 py-2">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid size-8 place-items-center rounded-full bg-card"
                aria-label="Decrease quantity"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-6 text-center font-display font-bold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="grid size-8 place-items-center rounded-full ember-gradient text-primary-foreground"
                aria-label="Increase quantity"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border glass-panel safe-bottom">
        <div className="mx-auto flex max-w-md items-center gap-4 px-5 py-4">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-display text-xl font-bold text-primary">
              {currency(num(item.price) * qty)}
            </p>
          </div>
          <button
            type="button"
            disabled={!item.is_available || addToCart.isPending}
            onClick={() => {
              if (!user) {
                navigate({ to: "/auth" });
                return;
              }
              addToCart.mutate({ menuItemId: item.id, quantity: qty });
            }}
            className="flex-1 rounded-2xl ember-gradient py-4 font-display text-sm font-bold text-primary-foreground shadow-ember disabled:opacity-50"
          >
            Add to bag
          </button>
        </div>
      </div>
    </div>
  );
}
