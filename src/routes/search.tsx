import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search as SearchIcon, SearchX } from "lucide-react";

import { EmptyState, Screen, ScreenHeader } from "@/components/app/Screen";
import { ItemRow, RestaurantCard } from "@/components/app/cards";
import { useAddToCart, useCategories, useSearch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search dishes and restaurants — Ember" },
      {
        name: "description",
        content: "Find pizza, burgers, sushi, bowls and desserts from Ember's partner kitchens.",
      },
      { property: "og:title", content: "Search dishes and restaurants — Ember" },
      {
        property: "og:description",
        content: "Search Ember's partner kitchens by dish, cuisine or restaurant.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [term, setTerm] = useState("");
  const { data, isFetching } = useSearch(term);
  const { data: categories } = useCategories();
  const addToCart = useAddToCart();

  return (
    <Screen>
      <ScreenHeader title="Search" subtitle="Dishes, cuisines and restaurants" />
      <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5">
        <SearchIcon className="size-5 text-primary" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Try 'truffle' or 'sushi'"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          autoComplete="off"
        />
      </div>

      {!term && (
        <>
          <h2 className="mt-7 font-display text-base font-bold">Popular searches</h2>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {(categories ?? []).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setTerm(c.name)}
                className={cn("rounded-full bg-card px-4 py-2.5 text-sm font-semibold")}
              >
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}

      {term && !isFetching && data && data.items.length === 0 && data.restaurants.length === 0 && (
        <EmptyState
          icon={<SearchX className="size-7" />}
          title="Nothing matched"
          body={`We couldn't find anything for "${term}". Try a different dish or cuisine.`}
        />
      )}

      {data && data.restaurants.length > 0 && (
        <section className="mt-7">
          <h2 className="font-display text-base font-bold">Restaurants</h2>
          <div className="mt-3 space-y-4">
            {data.restaurants.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        </section>
      )}

      {data && data.items.length > 0 && (
        <section className="mt-7">
          <h2 className="font-display text-base font-bold">Dishes</h2>
          <div className="mt-3 space-y-3">
            {data.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onAdd={() => addToCart.mutate({ menuItemId: item.id })}
              />
            ))}
          </div>
        </section>
      )}
    </Screen>
  );
}
