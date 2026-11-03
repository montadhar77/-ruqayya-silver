-- Rollback of 0008_drop_legacy: recreates the empty tables of the earlier exhibition project
-- exactly as they were (structure, keys, indexes, triggers, row level security, policies and
-- the API privileges left after 0004). Generated from 0000_baseline.sql. Data is not restored
-- (0008 refuses to run unless the tables are empty).
create table public.exhibitions (
  id uuid default gen_random_uuid() not null,
  title text default '[EXHIBITION TITLE]'::text not null,
  slug text not null,
  summary text default ''::text not null,
  description text default ''::text not null,
  opening_date text default '[OPENING DATE]'::text not null,
  closing_date text default '[CLOSING DATE]'::text not null,
  opening_hours text default '[OPENING HOURS]'::text not null,
  address text default '[ADDRESS]'::text not null,
  admission text default '[ADMISSION]'::text not null,
  is_published boolean default false not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
create table public.artworks (
  id uuid default gen_random_uuid() not null,
  exhibition_id uuid not null,
  title text default '[ARTWORK TITLE]'::text not null,
  slug text not null,
  medium text default ''::text not null,
  year text default ''::text not null,
  description text default ''::text not null,
  image_path text,
  image_alt text default ''::text not null,
  image_width integer,
  image_height integer,
  sort_order integer default 0 not null,
  is_published boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  title_ar text default ''::text not null,
  description_ar text default ''::text not null,
  category text default ''::text not null,
  material text default ''::text not null,
  gemstone text default ''::text not null,
  availability text default ''::text not null,
  price text default ''::text not null,
  is_featured boolean default false not null
);
create table public.artwork_images (
  id uuid default gen_random_uuid() not null,
  artwork_id uuid not null,
  image_path text not null,
  alt text default ''::text not null,
  width integer,
  height integer,
  sort_order integer default 0 not null,
  is_primary boolean default false not null,
  created_at timestamp with time zone default now() not null
);
create table public.messages (
  id uuid default gen_random_uuid() not null,
  name text not null,
  email text not null,
  body text not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default now() not null
);
create table public.newsletter_subscribers (
  id uuid default gen_random_uuid() not null,
  email text not null,
  is_confirmed boolean default false not null,
  created_at timestamp with time zone default now() not null
);
create table public.site_settings (
  id smallint default 1 not null,
  site_title text default '[SITE TITLE]'::text not null,
  site_tagline text default '[SITE TAGLINE]'::text not null,
  site_description text default '[SITE DESCRIPTION]'::text not null,
  contact_email text default '[EMAIL]'::text not null,
  contact_phone text default '[PHONE]'::text not null,
  address text default '[ADDRESS]'::text not null,
  instagram_url text default ''::text not null,
  updated_at timestamp with time zone default now() not null
);
create table public.social_links (
  platform text not null,
  url text default ''::text not null,
  is_enabled boolean default false not null,
  sort_order integer default 0 not null,
  updated_at timestamp with time zone default now() not null
);

alter table public.artwork_images add constraint artwork_images_pkey PRIMARY KEY (id);
alter table public.artworks add constraint artworks_pkey PRIMARY KEY (id);
alter table public.exhibitions add constraint exhibitions_pkey PRIMARY KEY (id);
alter table public.messages add constraint messages_pkey PRIMARY KEY (id);
alter table public.newsletter_subscribers add constraint newsletter_subscribers_pkey PRIMARY KEY (id);
alter table public.site_settings add constraint site_settings_pkey PRIMARY KEY (id);
alter table public.social_links add constraint social_links_pkey PRIMARY KEY (platform);
alter table public.artworks add constraint artworks_slug_key UNIQUE (slug);
alter table public.exhibitions add constraint exhibitions_slug_key UNIQUE (slug);
alter table public.newsletter_subscribers add constraint newsletter_subscribers_email_key UNIQUE (email);
alter table public.site_settings add constraint site_settings_id_check CHECK ((id = 1));
alter table public.artwork_images add constraint artwork_images_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES public.artworks(id) ON DELETE CASCADE;
alter table public.artworks add constraint artworks_exhibition_id_fkey FOREIGN KEY (exhibition_id) REFERENCES public.exhibitions(id) ON DELETE CASCADE;

CREATE INDEX artwork_images_artwork_idx ON public.artwork_images USING btree (artwork_id, sort_order, created_at);
CREATE UNIQUE INDEX artwork_images_single_primary_idx ON public.artwork_images USING btree (artwork_id) WHERE is_primary;
CREATE INDEX artworks_category_idx ON public.artworks USING btree (category, is_published) WHERE (category <> ''::text);
CREATE INDEX artworks_exhibition_idx ON public.artworks USING btree (exhibition_id, sort_order, created_at);
CREATE INDEX artworks_featured_idx ON public.artworks USING btree (is_featured, is_published, sort_order) WHERE is_featured;
CREATE INDEX artworks_public_page_idx ON public.artworks USING btree (is_published, sort_order, created_at, id);
CREATE INDEX artworks_recent_idx ON public.artworks USING btree (created_at DESC);
CREATE INDEX exhibitions_published_idx ON public.exhibitions USING btree (is_published, sort_order DESC, created_at DESC);
CREATE INDEX messages_unread_idx ON public.messages USING btree (is_read, created_at DESC);
CREATE INDEX newsletter_recent_idx ON public.newsletter_subscribers USING btree (created_at DESC);

CREATE TRIGGER artworks_touch BEFORE UPDATE ON public.artworks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER exhibitions_touch BEFORE UPDATE ON public.exhibitions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER site_settings_touch BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER social_links_touch BEFORE UPDATE ON public.social_links FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

alter table public.exhibitions enable row level security;
alter table public.artworks enable row level security;
alter table public.artwork_images enable row level security;
alter table public.messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.site_settings enable row level security;
alter table public.social_links enable row level security;

create policy artwork_images_admin_delete on public.artwork_images as permissive for delete to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy artwork_images_admin_insert on public.artwork_images as permissive for insert to authenticated with check (( SELECT private.is_admin() AS is_admin));
create policy artwork_images_admin_update on public.artwork_images as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy artwork_images_read on public.artwork_images as permissive for select to anon, authenticated using ((EXISTS ( SELECT 1 FROM public.artworks a WHERE (a.id = artwork_images.artwork_id))));
create policy artworks_admin_delete on public.artworks as permissive for delete to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy artworks_admin_insert on public.artworks as permissive for insert to authenticated with check (( SELECT private.is_admin() AS is_admin));
create policy artworks_admin_update on public.artworks as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy artworks_read on public.artworks as permissive for select to anon, authenticated using ((( SELECT private.is_admin() AS is_admin) OR (is_published AND (EXISTS ( SELECT 1 FROM public.exhibitions e WHERE ((e.id = artworks.exhibition_id) AND e.is_published))))));
create policy exhibitions_admin_delete on public.exhibitions as permissive for delete to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy exhibitions_admin_insert on public.exhibitions as permissive for insert to authenticated with check (( SELECT private.is_admin() AS is_admin));
create policy exhibitions_admin_update on public.exhibitions as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy exhibitions_read on public.exhibitions as permissive for select to anon, authenticated using ((is_published OR ( SELECT private.is_admin() AS is_admin)));
create policy messages_admin_delete on public.messages as permissive for delete to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy messages_admin_read on public.messages as permissive for select to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy messages_admin_write on public.messages as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy messages_public_insert on public.messages as permissive for insert to anon, authenticated with check ((((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 120)) AND ((length(TRIM(BOTH FROM email)) >= 3) AND (length(TRIM(BOTH FROM email)) <= 200)) AND ((length(TRIM(BOTH FROM body)) >= 1) AND (length(TRIM(BOTH FROM body)) <= 4000)) AND (is_read = false)));
create policy newsletter_admin_delete on public.newsletter_subscribers as permissive for delete to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy newsletter_admin_read on public.newsletter_subscribers as permissive for select to authenticated using (( SELECT private.is_admin() AS is_admin));
create policy newsletter_public_insert on public.newsletter_subscribers as permissive for insert to anon, authenticated with check ((((length(TRIM(BOTH FROM email)) >= 3) AND (length(TRIM(BOTH FROM email)) <= 200)) AND (POSITION(('@'::text) IN (email)) > 1) AND (is_confirmed = false)));
create policy settings_admin_write on public.site_settings as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy settings_public_read on public.site_settings as permissive for select to anon, authenticated using (true);
create policy social_links_admin_update on public.social_links as permissive for update to authenticated using (( SELECT private.is_admin() AS is_admin)) with check (( SELECT private.is_admin() AS is_admin));
create policy social_links_read on public.social_links as permissive for select to anon, authenticated using (true);

-- anti-abuse guards added by 0002
create trigger messages_rate_guard before insert on public.messages
  for each row when (current_user in ('anon', 'authenticated')) execute function private.inquiry_rate_guard();
create trigger newsletter_rate_guard before insert on public.newsletter_subscribers
  for each row when (current_user in ('anon', 'authenticated')) execute function private.inquiry_rate_guard();

-- privileges as they were after 0004 (no TRUNCATE / REFERENCES / TRIGGER)
grant select on public.exhibitions, public.artworks, public.artwork_images, public.site_settings, public.social_links to anon;
grant insert on public.messages, public.newsletter_subscribers to anon;
grant select, insert, update, delete on public.exhibitions, public.artworks, public.artwork_images, public.messages to authenticated;
grant select, insert, delete on public.newsletter_subscribers to authenticated;
grant select, update on public.site_settings, public.social_links to authenticated;

create policy artwork_images_admin_delete on storage.objects as permissive for delete to authenticated using (((bucket_id = 'artwork-images'::text) AND ( SELECT private.is_admin() AS is_admin)));
create policy artwork_images_admin_insert on storage.objects as permissive for insert to authenticated with check (((bucket_id = 'artwork-images'::text) AND ( SELECT private.is_admin() AS is_admin) AND (name ~~ 'artworks/%'::text)));
create policy artwork_images_admin_update on storage.objects as permissive for update to authenticated using (((bucket_id = 'artwork-images'::text) AND ( SELECT private.is_admin() AS is_admin))) with check (((bucket_id = 'artwork-images'::text) AND ( SELECT private.is_admin() AS is_admin) AND (name ~~ 'artworks/%'::text)));
create policy artwork_images_public_read on storage.objects as permissive for select to anon, authenticated using ((bucket_id = 'artwork-images'::text));
