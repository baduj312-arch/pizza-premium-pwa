import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";

import { EmptyState, Screen, ScreenHeader } from "@/components/app/Screen";
import { ItemCard } from "@/components/app/cards";
import { useAddToCart, useFavorites, useToggleFavorite } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/favorites")({
  head: () => ({
    meta: [
      { title: "Saved dishes — Ember" },
      { name: "description", content: "Your saved dishes, ready to reorder in one tap." },
      { property: "og:title", content: "Saved dishes — Ember" },
      { property: "og:description", content: "Reorder your favorite dishes on Ember." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const addToCart = useAddToCart();
  const rows = (favorites ?? []).filter((f) => f.menu_items);

  return (
    <Screen>
      <ScreenHeader title="Saved" subtitle={`${rows.length} dish${rows.length === 1 ? "" : "es"}`} />
      {rows.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-7" />}
          title="No favorites yet"
          body="Tap the heart on any dish and it'll be waiting for you here."
          action={
            <Link
              to="/"
              className="rounded-full ember-gradient px-6 py-3 text-sm font-bold text-primary-foreground"
            >
              Find something
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {rows.map((f) => (
            <ItemCard
              key={f.id}
              item={f.menu_items!}
              isFavorite
              onToggleFavorite={() =>
                toggleFavorite.mutate({ menuItemId: f.menu_item_id, isFav: true })
              }
              onAdd={() => addToCart.mutate({ menuItemId: f.menu_item_id })}
            />
          ))}
        </div>
      )}
    </Screen>
  );
}
