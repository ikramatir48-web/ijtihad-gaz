-- ============================================================
-- SCHÉMA SUPABASE — Application de Facturation Gaz
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- 1. PROFILES (étend auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  nom text not null,
  telephone text,
  adresse text,
  role text not null check (role in ('admin', 'client')) default 'client',
  numero_client text unique, -- ex: CLT-001
  created_at timestamptz default now()
);

-- Auto-générer numéro client
create or replace function generate_numero_client()
returns trigger as $$
declare
  next_num int;
  new_numero text;
begin
  if new.role = 'client' and new.numero_client is null then
    select coalesce(max(cast(substring(numero_client from 5) as int)), 0) + 1
    into next_num
    from public.profiles
    where numero_client like 'CLT-%';
    new.numero_client := 'CLT-' || lpad(next_num::text, 3, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_numero_client
  before insert on public.profiles
  for each row execute function generate_numero_client();

-- Trigger pour créer profil automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, nom, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nom', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. PRODUITS
create table public.produits (
  id uuid default gen_random_uuid() primary key,
  nom text not null,
  description text,
  poids_kg numeric not null,
  prix_unitaire numeric(10,2) not null,
  actif boolean default true,
  created_at timestamptz default now()
);

-- Produits de base
insert into public.produits (nom, description, poids_kg, prix_unitaire) values
  ('Bouteille 3 kg',  'Bouteille de gaz butane 3 kg',  3,  500),
  ('Bouteille 6 kg',  'Bouteille de gaz butane 6 kg',  6,  900),
  ('Bouteille 12 kg', 'Bouteille de gaz butane 12 kg', 12, 1600);

-- 3. COMMANDES
create table public.commandes (
  id uuid default gen_random_uuid() primary key,
  numero_commande text unique not null,
  client_id uuid references public.profiles(id) not null,
  statut text not null check (statut in ('en_attente','validee','en_livraison','livree','annulee')) default 'en_attente',
  mode_paiement text not null check (mode_paiement in ('credit','livraison')),
  statut_paiement text not null check (statut_paiement in ('non_paye','paye')) default 'non_paye',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-numérotation commandes
create or replace function generate_numero_commande()
returns trigger as $$
declare
  next_num int;
begin
  select coalesce(max(cast(substring(numero_commande from 5) as int)), 0) + 1
  into next_num
  from public.commandes
  where numero_commande like 'CMD-%';
  new.numero_commande := 'CMD-' || lpad(next_num::text, 5, '0');
  return new;
end;
$$ language plpgsql;

create trigger set_numero_commande
  before insert on public.commandes
  for each row execute function generate_numero_commande();

-- 4. LIGNES DE COMMANDE
create table public.lignes_commande (
  id uuid default gen_random_uuid() primary key,
  commande_id uuid references public.commandes(id) on delete cascade not null,
  produit_id uuid references public.produits(id) not null,
  quantite int not null check (quantite > 0),
  prix_unitaire numeric(10,2) not null, -- prix au moment de la commande
  created_at timestamptz default now()
);

-- 5. BONS DE LIVRAISON
create table public.bons_livraison (
  id uuid default gen_random_uuid() primary key,
  numero_bl text unique not null,
  commande_id uuid references public.commandes(id) not null,
  date_creation timestamptz default now(),
  date_livraison timestamptz,
  notes_livraison text
);

-- Auto-numérotation BL
create or replace function generate_numero_bl()
returns trigger as $$
declare
  next_num int;
begin
  select coalesce(max(cast(substring(numero_bl from 4) as int)), 0) + 1
  into next_num
  from public.bons_livraison
  where numero_bl like 'BL-%';
  new.numero_bl := 'BL-' || lpad(next_num::text, 5, '0');
  return new;
end;
$$ language plpgsql;

create trigger set_numero_bl
  before insert on public.bons_livraison
  for each row execute function generate_numero_bl();

-- 6. FACTURES
create table public.factures (
  id uuid default gen_random_uuid() primary key,
  numero_facture text unique not null,
  commande_id uuid references public.commandes(id) not null,
  bl_id uuid references public.bons_livraison(id) not null,
  montant_total numeric(10,2) not null,
  date_facture timestamptz default now(),
  date_paiement timestamptz
);

-- Auto-numérotation factures
create or replace function generate_numero_facture()
returns trigger as $$
declare
  next_num int;
  yr text;
begin
  yr := to_char(now(), 'YYYY');
  select coalesce(max(cast(substring(numero_facture from length('FACT-' || yr || '-') + 1) as int)), 0) + 1
  into next_num
  from public.factures
  where numero_facture like 'FACT-' || yr || '-%';
  new.numero_facture := 'FACT-' || yr || '-' || lpad(next_num::text, 4, '0');
  return new;
end;
$$ language plpgsql;

create trigger set_numero_facture
  before insert on public.factures
  for each row execute function generate_numero_facture();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.produits enable row level security;
alter table public.commandes enable row level security;
alter table public.lignes_commande enable row level security;
alter table public.bons_livraison enable row level security;
alter table public.factures enable row level security;

-- Profiles
create policy "Utilisateur voit son profil" on public.profiles
  for select using (auth.uid() = id);
create policy "Admin voit tous les profils" on public.profiles
  for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admin modifie profils" on public.profiles
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Insert profil own" on public.profiles
  for insert with check (auth.uid() = id);

-- Produits (tout le monde peut lire)
create policy "Lecture produits" on public.produits
  for select using (true);
create policy "Admin gère produits" on public.produits
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Commandes
create policy "Client voit ses commandes" on public.commandes
  for select using (auth.uid() = client_id);
create policy "Client crée commande" on public.commandes
  for insert with check (auth.uid() = client_id);
create policy "Admin voit toutes commandes" on public.commandes
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Lignes commande
create policy "Client voit ses lignes" on public.lignes_commande
  for select using (exists (select 1 from public.commandes where id = commande_id and client_id = auth.uid()));
create policy "Client insère ses lignes" on public.lignes_commande
  for insert with check (exists (select 1 from public.commandes where id = commande_id and client_id = auth.uid()));
create policy "Admin gère lignes" on public.lignes_commande
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- BL
create policy "Client voit ses BL" on public.bons_livraison
  for select using (exists (select 1 from public.commandes where id = commande_id and client_id = auth.uid()));
create policy "Admin gère BL" on public.bons_livraison
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Factures
create policy "Client voit ses factures" on public.factures
  for select using (exists (select 1 from public.commandes where id = commande_id and client_id = auth.uid()));
create policy "Admin gère factures" on public.factures
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
