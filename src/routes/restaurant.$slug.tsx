import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Clock, Star, Bike } from "lucide-react";

import { BottomNav } from "@/components/app/BottomNav";
import { ItemRow } from "@/components/app/cards";
import { Skeleton } from "@/components/ui/skeleton";
import { useAddToCart, useMenuItems, useRestaurant } from "@/lib/api";
import { currency, num } from "@/lib/format";

export const Route = createFileRoute("/restaurant/$slug")({
  head: ({ params }) => {
    const name = params.slug
      .split("-")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `${name} — menu & delivery | Ember` },
        {
          name: "description",
          content: `Browse the full ${name} menu on Ember and order for delivery with live tracking.`,
        },
        { property: "og:title", content: `${name} — menu & delivery | Ember` },
        {
          property: "og:description",
          content: `Order from ${name} on Ember with live delivery tracking.`,
        },
      ],
    };
  },
  component: RestaurantPage,
});

function RestaurantPage() {
  const { slug } = Route.useParams();
  const { data: restaurant, isLoading } = useRestaurant(slug);
  const { data: items } = useMenuItems(
    restaurant?.id ? { restaurantId: restaurant.id } : { restaurantId: undefined },
  );
  const addToCart = useAddToCart();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-5">
        <Skeleton className="h-56 rounded-3xl" />
        <Skeleton className="mt-4 h-24 rounded-3xl" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-xl font-bold">Restaurant not found</h1>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const menuByCategory = items ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-64">
        <img
          src={restaurant.cover_image ?? "/images/cover-forno-nero.jpg"}
          alt={restaurant.name}
          width={1280}
          height={720}
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/20" />
        <Link
          to="/"
          className="absolute left-5 top-6 grid size-10 place-items-center rounded-full bg-background/70 backdrop-blur"
          aria-label="Go back"
        >
          <ChevronLeft className="size-5" />
        </Link>
      </div>

      <main className="mx-auto -mt-12 max-w-md px-5 pb-32">
        <div className="rounded-3xl bg-card p-5 shadow-panel">
          <h1 className="font-display text-2xl font-bold">{restaurant.name}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{restaurant.description}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat
              icon={<Star className="size-4 fill-primary text-primary" />}
              value={num(restaurant.rating).toFixed(1)}
              label={`${restaurant.review_count.toLocaleString()} reviews`}
            />
            <Stat
              icon={<Clock className="size-4 text-primary" />}
              value={`${restaurant.delivery_minutes} min`}
              label="Delivery time"
            />
            <Stat
              icon={<Bike className="size-4 text-primary" />}
              value={currency(restaurant.delivery_fee)}
              label="Delivery fee"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {restaurant.tags.map((t) => (
              <span key={t} className="rounded-full bg-elevated px-3 py-1 text-xs font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>

        <h2 className="mt-7 font-display text-lg font-bold">Menu</h2>
        <div className="mt-3 space-y-3">
          {menuByCategory.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onAdd={() => addToCart.mutate({ menuItemId: item.id })}
            />
          ))}
          {menuByCategory.length === 0 && (
            <p className="text-sm text-muted-foreground">This kitchen is updating its menu.</p>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-elevated p-3">
      <div className="flex justify-center">{icon}</div>
      <p className="mt-1.5 font-display text-sm font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
