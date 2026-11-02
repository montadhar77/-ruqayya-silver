-- Synthetic test data only (no real customers, phones or e-mails).
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin@test.invalid'),
  ('00000000-0000-4000-8000-0000000000b2', 'visitor@test.invalid');
insert into public.admins (user_id) values ('00000000-0000-4000-8000-0000000000a1');

insert into public.settings (id, data) values (1, '{
  "brand": {"name": "معرض رقية", "full": "معرض رقية (عليها السلام)"},
  "shop": {"currency": "د.ع", "delivery_fee": 5000, "free_delivery_over": 0,
           "intl_delivery_fee": 0, "intl_free_over": 0},
  "contact": {"phone": "07000000000", "whatsapp": "9647000000000"}
}'::jsonb);

insert into public.categories (id, name, subtitle, slug, icon, sort) values
  ('10000000-0000-4000-8000-000000000001', 'خواتم رجالية', 'عقيق · فيروز', 'mens-rings', 'men', 1),
  ('10000000-0000-4000-8000-000000000002', 'مسابح', 'يُسر · كهرب', 'misbaha', 'misbaha', 2),
  ('10000000-0000-4000-8000-000000000003', 'قسم مخفي', '', 'hidden-cat', 'gift', 3);
update public.categories set active = false where slug = 'hidden-cat';

-- p1: unlimited stock · p2: 5 in stock · p3: 1 in stock · p4: inactive · p5: 0 in stock
insert into public.products (id, category_id, name, description, price, old_price, stock, featured, active, sort, images) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'خاتم الفيروز النيشابوري', 'فيروز في فضة ٩٢٥', 240000, null, null, true, true, 1, '{https://example.invalid/p1.webp}'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'خاتم العقيق اليماني', 'عقيق يماني', 320000, 360000, 5, true, true, 2, '{}'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'مسبحة يُسر أسود', 'يُسر', 120000, null, 1, false, true, 3, '{}'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'قطعة متوقفة', '', 50000, null, null, false, false, 4, '{}'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'مسبحة كهرب', 'كهرب', 90000, null, 0, false, true, 5, '{}');
