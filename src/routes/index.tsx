import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, MapPin, Star, Flame, Clock } from "lucide-react";

import { Screen } from "@/components/app/Screen";
import { ItemCard, RestaurantCard } from "@/components/app/cards";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAddToCart,
  useCategories,
  useMenuItems,
  usePromotions,
  useRestaurants,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { currency, num } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ember — Wood-Fired Pizza & More, Delivered" },
      {
        name: "description",
        content:
          "Browse premium restaurants, order in a tap and follow your delivery live with Ember.",
      },
      { property: "og:title", content: "Ember — Wood-Fired Pizza & More, Delivered" },
      {
        property: "og:description",
        content: "Premium restaurants, one-tap ordering and live delivery tracking.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { data: categories } = useCategories();
  const { data: restaurants, isLoading: loadingRestaurants } = useRestaurants();
  const { data: promos } = usePromotions();
  const { data: items, isLoading: loadingItems } = useMenuItems(
    activeCategory ? { categoryId: activeCategory } : {},
  );
  const addToCart = useAddToCart();

  const popular = (items ?? []).filter((i) => (activeCategory ? true : i.is_popular));

  return (
    <Screen className="pt-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <MapPin className="size-3.5 text-primary" /> Deliver to
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold leading-tight">
            Hungry{user ? " again" : ""}?
            <br />
            <span className="text-primary">Let's fix that.</span>
          </h1>
        </div>
        <Link
          to="/profile"
          className="grid size-11 place-items-center rounded-2xl bg-card font-display text-sm font-bold text-primary"
        >
          {(user?.email ?? "G").slice(0, 1).toUpperCase()}
        </Link>
      </div>

      <button
        type="button"
        onClick={() => navigate({ to: "/search" })}
        className="mt-6 flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3.5 text-left text-sm text-muted-foreground"
      >
        <Search className="size-5 text-primary" />
        Search pizza, sushi, bowls…
      </button>

      {/* Promotions — auto-sliding tiles */}
      <PromoSlider promos={promos} />


      {/* Categories */}
      <section className="mt-7">
        <h2 className="font-display text-lg font-bold">Categories</h2>
        <div className="scrollbar-none -mx-5 mt-3 flex gap-2.5 overflow-x-auto px-5">
          <CategoryChip
            label="All"
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          />
          {(categories ?? []).map((c) => (
            <CategoryChip
              key={c.id}
              label={c.name}
              active={activeCategory === c.id}
              onClick={() => setActiveCategory(c.id)}
            />
          ))}
        </div>
      </section>

      {/* Popular items */}
      <section className="mt-7">
        <div className="flex items-end justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Flame className="size-5 text-primary" />
            {activeCategory ? "In this category" : "Popular right now"}
          </h2>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-4">
          {loadingItems &&
            [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-52 rounded-3xl" />)}
          {popular.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onAdd={() => addToCart.mutate({ menuItemId: item.id })}
            />
          ))}
        </div>
      </section>

      {/* Restaurants */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-bold">Top restaurants</h2>
        <div className="mt-3 space-y-4">
          {loadingRestaurants &&
            [0, 1].map((i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}
          {(restaurants ?? []).map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-3xl bg-card p-5">
        <h2 className="font-display text-base font-bold">Why Ember</h2>
        <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
          <li className="flex items-center gap-3">
            <Clock className="size-4 text-primary" /> Live tracking from kitchen to door
          </li>
          <li className="flex items-center gap-3">
            <Star className="size-4 text-primary" /> Only restaurants rated 4.5 and above
          </li>
          <li className="flex items-center gap-3">
            <Flame className="size-4 text-primary" /> Delivery from{" "}
            {currency(num(restaurants?.[0]?.delivery_fee ?? 1.49))}
          </li>
        </ul>
      </section>
    </Screen>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors",
        active
          ? "ember-gradient text-primary-foreground shadow-ember"
          : "bg-card text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}
