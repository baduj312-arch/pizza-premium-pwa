-- ROLES
create type public.app_role as enum ('admin','customer');
create type public.order_status as enum ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "admins read all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'admin')) with check (true);

create or replace function public.update_updated_at_column() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer') on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- CATALOG
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text not null default 'utensils',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public read" on public.categories for select to anon, authenticated using (true);
create policy "categories admin write" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  cover_image text,
  cuisine text,
  rating numeric(2,1) not null default 4.5,
  review_count int not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  delivery_minutes int not null default 30,
  min_order numeric(10,2) not null default 0,
  address text,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.restaurants to anon, authenticated;
grant insert, update, delete on public.restaurants to authenticated;
grant all on public.restaurants to service_role;
alter table public.restaurants enable row level security;
create policy "restaurants public read" on public.restaurants for select to anon, authenticated using (true);
create policy "restaurants admin write" on public.restaurants for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  image_url text,
  calories int,
  is_popular boolean not null default false,
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;
grant all on public.menu_items to service_role;
alter table public.menu_items enable row level security;
create policy "menu public read" on public.menu_items for select to anon, authenticated using (true);
create policy "menu admin write" on public.menu_items for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  discount_percent int not null default 0,
  image_url text,
  is_active boolean not null default true,
  valid_until timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.promotions to anon, authenticated;
grant insert, update, delete on public.promotions to authenticated;
grant all on public.promotions to service_role;
alter table public.promotions enable row level security;
create policy "promotions public read" on public.promotions for select to anon, authenticated using (true);
create policy "promotions admin write" on public.promotions for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- CUSTOMER DATA
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, menu_item_id)
);
grant select, insert, update, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;
alter table public.favorites enable row level security;
create policy "own favorites" on public.favorites for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  quantity int not null default 1,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, menu_item_id)
);
grant select, insert, update, delete on public.cart_items to authenticated;
grant all on public.cart_items to service_role;
alter table public.cart_items enable row level security;
create policy "own cart" on public.cart_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  status public.order_status not null default 'pending',
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  address text not null,
  phone text,
  payment_method text not null default 'card',
  promo_code text,
  courier_name text,
  eta_minutes int not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders read" on public.orders for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "own orders insert" on public.orders for insert to authenticated with check (auth.uid() = user_id);
create policy "own orders update" on public.orders for update to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin')) with check (true);
create policy "admin orders delete" on public.orders for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create trigger orders_updated_at before update on public.orders for each row execute function public.update_updated_at_column();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name text not null,
  price numeric(10,2) not null default 0,
  quantity int not null default 1,
  image_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "own order items read" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin')))
);
create policy "own order items insert" on public.order_items for insert to authenticated with check (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
create policy "admin order items write" on public.order_items for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

alter publication supabase_realtime add table public.orders;

-- SEED
insert into public.categories (name, slug, icon, sort_order) values
  ('Pizza','pizza','pizza',1),
  ('Burgers','burgers','beef',2),
  ('Sushi','sushi','fish',3),
  ('Salads','salads','salad',4),
  ('Desserts','desserts','cake',5),
  ('Drinks','drinks','cup-soda',6);

insert into public.restaurants (name, slug, description, cover_image, cuisine, rating, review_count, delivery_fee, delivery_minutes, min_order, address, tags) values
  ('Forno Nero','forno-nero','Napoli-style wood-fired pizza, blistered crusts and 48-hour dough.','/images/cover-forno-nero.jpg','Italian',4.9,2841,2.49,25,10,'12 Ember Lane','{"Wood-fired","Late night","Top rated"}'),
  ('Smoke & Char','smoke-char','Dry-aged smash burgers, charcoal grill, house pickles.','/images/cover-smoke-char.jpg','American',4.7,1620,1.99,20,8,'88 Foundry Road','{"Burgers","Charcoal","Fast"}'),
  ('Sakura Bento','sakura-bento','Hand-cut sashimi and precision nigiri, delivered chilled.','/images/cover-sakura.jpg','Japanese',4.8,1194,3.49,35,15,'5 Lantern Court','{"Sushi","Premium"}'),
  ('Verde Bowl','verde-bowl','Cold-pressed dressings, market greens, protein bowls.','/images/cover-verde.jpg','Healthy',4.6,872,1.49,18,6,'31 Garden Walk','{"Healthy","Vegan options"}');

insert into public.menu_items (restaurant_id, category_id, name, description, price, image_url, calories, is_popular, sort_order)
select r.id, c.id, v.name, v.description, v.price, v.image_url, v.calories, v.is_popular, v.sort_order
from (values
  ('forno-nero','pizza','Margherita Nera','San Marzano tomato, fior di latte, basil, cold-pressed olive oil.',13.90,'/images/pizza-margherita.jpg',780,true,1),
  ('forno-nero','pizza','Diavola Honey','Spicy pepperoni, fior di latte, chili honey drizzle.',16.50,'/images/pizza-pepperoni.jpg',920,true,2),
  ('forno-nero','pizza','Tartufo Bianco','Truffle cream, mushrooms, taleggio, thyme.',18.90,'/images/pizza-truffle.jpg',860,false,3),
  ('forno-nero','desserts','Tiramisu Classico','Mascarpone, espresso-soaked savoiardi, cocoa.',7.50,'/images/dessert-tiramisu.jpg',420,false,4),
  ('forno-nero','drinks','Blood Orange Soda','House-made, lightly bitter, over ice.',3.90,'/images/drink-soda.jpg',110,false,5),
  ('smoke-char','burgers','Double Smash','Two dry-aged patties, aged cheddar, house sauce.',14.90,'/images/burger-smash.jpg',940,true,1),
  ('smoke-char','burgers','Charcoal Bacon','Smoked bacon, caramelised onion, smoked mayo.',16.20,'/images/burger-smash.jpg',1010,false,2),
  ('smoke-char','burgers','Buttermilk Chicken','Crisp buttermilk thigh, pickles, hot honey.',13.80,'/images/wings.jpg',820,true,3),
  ('smoke-char','drinks','Salted Caramel Shake','Thick, cold, salted caramel swirl.',6.40,'/images/dessert-tiramisu.jpg',560,false,4),
  ('sakura-bento','sushi','Omakase Platter','16 pieces of chef-selected nigiri and maki.',32.00,'/images/sushi-platter.jpg',680,true,1),
  ('sakura-bento','sushi','Salmon Aburi','Flame-seared salmon nigiri, yuzu kosho.',14.50,'/images/sushi-platter.jpg',380,true,2),
  ('sakura-bento','salads','Wakame Seaweed','Sesame, rice vinegar, chilli threads.',6.90,'/images/salad-bowl.jpg',180,false,3),
  ('verde-bowl','salads','Charred Greens Bowl','Charred broccolini, quinoa, tahini-lemon.',12.40,'/images/salad-bowl.jpg',430,true,1),
  ('verde-bowl','salads','Miso Grain Bowl','Brown rice, edamame, avocado, miso dressing.',13.20,'/images/salad-bowl.jpg',510,false,2),
  ('verde-bowl','drinks','Cold Green Press','Cucumber, apple, mint, lime.',5.50,'/images/drink-soda.jpg',90,false,3)
) as v(rslug, cslug, name, description, price, image_url, calories, is_popular, sort_order)
join public.restaurants r on r.slug = v.rslug
join public.categories c on c.slug = v.cslug;

insert into public.promotions (code, title, description, discount_percent, image_url, valid_until) values
  ('NERO20','20% off wood-fired pizza','Forno Nero first orders. Minimum spend applies.',20,'/images/pizza-pepperoni.jpg', now() + interval '30 days'),
  ('SMASH15','15% off Smoke & Char','Any burger, any time this month.',15,'/images/burger-smash.jpg', now() + interval '30 days'),
  ('GREEN10','10% off Verde Bowl','Cold-pressed and market fresh.',10,'/images/salad-bowl.jpg', now() + interval '60 days'),
  ('SAKURA25','25% off first sushi order','Omakase platters included.',25,'/images/sushi-platter.jpg', now() + interval '14 days');