import { Link } from "@tanstack/react-router";
import { Star, Clock, Heart, Plus } from "lucide-react";

import { currency, num } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MenuItem, Restaurant } from "@/lib/api";

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link
      to="/restaurant/$slug"
      params={{ slug: restaurant.slug }}
      className="block overflow-hidden rounded-3xl bg-card shadow-panel"
    >
      <div className="relative aspect-[16/9]">
        <img
          src={restaurant.cover_image ?? "/images/cover-forno-nero.jpg"}
          alt={restaurant.name}
          loading="lazy"
          width={1280}
          height={720}
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-background/70 px-3 py-1 text-xs font-semibold backdrop-blur">
          {restaurant.cuisine}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="truncate font-display text-base font-semibold">{restaurant.name}</h3>
          <span className="flex items-center gap-1 text-sm font-semibold text-primary">
            <Star className="size-4 fill-primary" />
            {num(restaurant.rating).toFixed(1)}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{restaurant.description}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" />
            {restaurant.delivery_minutes} min
          </span>
          <span>·</span>
          <span>{currency(restaurant.delivery_fee)} delivery</span>
          <span>·</span>
          <span>{restaurant.review_count.toLocaleString()} reviews</span>
        </div>
      </div>
    </Link>
  );
}

export function ItemCard({
  item,
  onAdd,
  isFavorite,
  onToggleFavorite,
}: {
  item: MenuItem;
  onAdd?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-card">
      <Link to="/item/$id" params={{ id: item.id }} className="block">
        <div className="relative aspect-[4/3]">
          <img
            src={item.image_url ?? "/images/pizza-margherita.jpg"}
            alt={item.name}
            loading="lazy"
            width={1024}
            height={768}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {item.is_popular && (
            <span className="absolute left-2 top-2 rounded-full ember-gradient px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
              Popular
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="truncate text-sm font-semibold">{item.name}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {item.restaurants?.name ?? item.description}
          </p>
          <p className="mt-2 font-display text-base font-bold text-primary">
            {currency(item.price)}
          </p>
        </div>
      </Link>
      {onToggleFavorite && (
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label="Toggle favorite"
          className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-background/70 backdrop-blur"
        >
          <Heart
            className={cn(
              "size-4",
              isFavorite ? "fill-primary text-primary" : "text-foreground",
            )}
          />
        </button>
      )}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add ${item.name} to bag`}
          className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-2xl ember-gradient text-primary-foreground shadow-ember active:scale-95 transition-transform"
        >
          <Plus className="size-5" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}

export function ItemRow({ item, onAdd }: { item: MenuItem; onAdd?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-card p-3">
      <Link to="/item/$id" params={{ id: item.id }} className="shrink-0">
        <img
          src={item.image_url ?? "/images/pizza-margherita.jpg"}
          alt={item.name}
          loading="lazy"
          width={1024}
          height={768}
          className="size-20 rounded-2xl object-cover"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to="/item/$id" params={{ id: item.id }}>
          <h3 className="truncate text-sm font-semibold">{item.name}</h3>
        </Link>
        <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
        <p className="mt-1 font-display text-sm font-bold text-primary">{currency(item.price)}</p>
      </div>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add ${item.name} to bag`}
          className="grid size-10 shrink-0 place-items-center rounded-2xl ember-gradient text-primary-foreground shadow-ember active:scale-95 transition-transform"
        >
          <Plus className="size-5" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
