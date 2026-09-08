import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { num } from "@/lib/format";

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
};

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  cuisine: string | null;
  rating: number;
  review_count: number;
  delivery_fee: number;
  delivery_minutes: number;
  min_order: number;
  address: string | null;
  tags: string[];
  is_active: boolean;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  calories: number | null;
  is_popular: boolean;
  is_available: boolean;
  sort_order: number;
  restaurants?: { name: string; slug: string } | null;
};

export type Promotion = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discount_percent: number;
  image_url: string | null;
  is_active: boolean;
  valid_until: string | null;
};

export type CartRow = {
  id: string;
  quantity: number;
  menu_item_id: string;
  menu_items: MenuItem | null;
};

export type Order = {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  status: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  address: string;
  phone: string | null;
  payment_method: string;
  promo_code: string | null;
  courier_name: string | null;
  eta_minutes: number;
  created_at: string;
  updated_at: string;
  restaurants?: { name: string; slug: string } | null;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
  menu_item_id: string | null;
};

/* ---------------- catalog ---------------- */

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useRestaurants() {
  return useQuery({
    queryKey: ["restaurants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .order("rating", { ascending: false });
      if (error) throw error;
      return data as Restaurant[];
    },
  });
}

export function useRestaurant(slug: string) {
  return useQuery({
    queryKey: ["restaurant", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as Restaurant | null;
    },
  });
}

export function useMenuItems(opts: { restaurantId?: string; categoryId?: string } = {}) {
  return useQuery({
    queryKey: ["menu-items", opts.restaurantId ?? null, opts.categoryId ?? null],
    queryFn: async () => {
      let q = supabase
        .from("menu_items")
        .select("*, restaurants(name, slug)")
        .order("sort_order");
      if (opts.restaurantId) q = q.eq("restaurant_id", opts.restaurantId);
      if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
      const { data, error } = await q;
      if (error) throw error;
      return data as MenuItem[];
    },
  });
}

export function useMenuItem(id: string) {
  return useQuery({
    queryKey: ["menu-item", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*, restaurants(name, slug)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as MenuItem | null;
    },
  });
}

export function useSearch(term: string) {
  return useQuery({
    queryKey: ["search", term],
    enabled: term.trim().length > 0,
    queryFn: async () => {
      const like = `%${term.trim()}%`;
      const [items, restaurants] = await Promise.all([
        supabase
          .from("menu_items")
          .select("*, restaurants(name, slug)")
          .or(`name.ilike.${like},description.ilike.${like}`)
          .limit(30),
        supabase
          .from("restaurants")
          .select("*")
          .or(`name.ilike.${like},cuisine.ilike.${like},description.ilike.${like}`)
          .limit(10),
      ]);
      if (items.error) throw items.error;
      if (restaurants.error) throw restaurants.error;
      return {
        items: (items.data ?? []) as MenuItem[],
        restaurants: (restaurants.data ?? []) as Restaurant[],
      };
    },
  });
}

export function usePromotions() {
  return useQuery({
    queryKey: ["promotions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as Promotion[];
    },
  });
}

/* ---------------- favorites ---------------- */

export function useFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("id, menu_item_id, menu_items(*, restaurants(name, slug))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { id: string; menu_item_id: string; menu_items: MenuItem | null }[];
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ menuItemId, isFav }: { menuItemId: string; isFav: boolean }) => {
      if (!user) throw new Error("Sign in to save favorites");
      if (isFav) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("menu_item_id", menuItemId);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, menu_item_id: menuItemId });
      if (error) throw error;
      return true;
    },
    onSuccess: (added) => {
      void qc.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(added ? "Added to favorites" : "Removed from favorites");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ---------------- cart ---------------- */

export function useCart() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cart", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_items")
        .select("id, quantity, menu_item_id, menu_items(*, restaurants(name, slug))")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as CartRow[];
    },
  });
}

export function useCartTotals(rows: CartRow[] | undefined) {
  const items = rows ?? [];
  const subtotal = items.reduce(
    (sum, r) => sum + num(r.menu_items?.price) * r.quantity,
    0,
  );
  const count = items.reduce((sum, r) => sum + r.quantity, 0);
  return { subtotal, count };
}

export function useAddToCart() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ menuItemId, quantity = 1 }: { menuItemId: string; quantity?: number }) => {
      if (!user) throw new Error("Sign in to start an order");
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("menu_item_id", menuItemId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + quantity })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cart_items")
          .insert({ user_id: user.id, menu_item_id: menuItemId, quantity });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to your bag");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCartQty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (quantity <= 0) {
        const { error } = await supabase.from("cart_items").delete().eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cart"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ---------------- orders ---------------- */

export function useOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, restaurants(name, slug), order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, restaurants(name, slug), order_items(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Order | null;
    },
  });
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        full_name: string | null;
        phone: string | null;
        avatar_url: string | null;
        address: string | null;
      } | null;
    },
  });
}
