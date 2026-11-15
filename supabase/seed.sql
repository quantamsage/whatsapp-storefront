-- ============================================================
-- Demo data: a small coffee shop, so the store isn't empty on first run.
-- Run after setup.sql. Safe to re-run (it skips rows that already exist).
-- Replace everything from the admin dashboard when you set up a real shop.
-- ============================================================

insert into public.categories (name)
values ('Coffee'), ('Tea'), ('Brewing gear')
on conflict (name) do nothing;

insert into public.site_content (
  key, store_name, logo_url, hero_badge, hero_title, hero_subtitle,
  cta_primary, cta_secondary, why_title, why_bullets, panel_images,
  brand_primary, brand_primary_strong, brand_primary_soft, brand_accent, brand_accent_soft,
  currency, whatsapp_number, tagline, option_label, option_unit, low_stock_threshold
)
values (
  'default',
  'Highland Roasters',
  '/logo.svg',
  'Same-day delivery in town',
  'Fresh coffee, roasted this week',
  'Single-origin beans, loose-leaf tea and simple brewing gear. Add to your cart and send the order straight to us on WhatsApp.',
  'Shop now',
  'Talk to us',
  'Why order here?',
  array[
    'Roasted in small batches every week.',
    'Pick the bag size that suits you.',
    'Order on WhatsApp and get a quick reply.'
  ],
  array['/demo/house-blend.svg', '/demo/kenya-aa.svg', '/demo/chai.svg',
        '/demo/mug.svg', '/demo/press.svg', '/demo/grinder.svg'],
  '#1f6b4f', '#16503b', '#dcefe6', '#c7a14a', '#f4ead2',
  'KES', '254700000000', 'Fresh coffee and tea, ordered over WhatsApp.', 'Bag size', 'g', 3
)
on conflict (key) do nothing;

-- name, price, description, image, category, option sizes (grams + price), stock (null = not tracked)
with data (name, price, description, image, category, sizes, stock) as (
  values
    ('House Blend', 950, 'Chocolatey, smooth and easy to drink. Our everyday medium roast.',
     '/demo/house-blend.svg', 'Coffee',
     '[{"size_ml": 250, "price": 950}, {"size_ml": 500, "price": 1800}, {"size_ml": 1000, "price": 3400}]', 40),
    ('Kenya AA', 1300, 'Bright blackcurrant and citrus from Nyeri. Light roast, great as pour-over.',
     '/demo/kenya-aa.svg', 'Coffee',
     '[{"size_ml": 250, "price": 1300}, {"size_ml": 500, "price": 2500}]', 2),
    ('Swiss Water Decaf', 1100, 'All the flavour, none of the caffeine. Decaffeinated with water only.',
     '/demo/decaf.svg', 'Coffee', null, 0),
    ('Masala Chai', 650, 'Black tea with cardamom, ginger, cinnamon and clove. 200 g tin.',
     '/demo/chai.svg', 'Tea', null, 25),
    ('Green Tea', 700, 'Grassy, gentle loose-leaf green tea from the Kericho highlands. 150 g tin.',
     '/demo/green-tea.svg', 'Tea', null, null),
    ('Enamel Mug', 800, 'Speckled 350 ml enamel mug. Tough enough for camping.',
     '/demo/mug.svg', 'Brewing gear', null, 12),
    ('French Press', 2900, '1 litre glass French press with a stainless steel filter.',
     '/demo/press.svg', 'Brewing gear', null, 3),
    ('Hand Grinder', 4500, 'Adjustable ceramic burr grinder, from espresso-fine to French-press coarse.',
     '/demo/grinder.svg', 'Brewing gear', null, null)
)
insert into public.products (name, price, description, image_urls, category_id, is_decant, decant_sizes, in_stock, stock_quantity)
select d.name, d.price, d.description, array[d.image], c.id,
       d.sizes is not null, d.sizes::jsonb, true, d.stock
from data d
join public.categories c on c.name = d.category
where not exists (select 1 from public.products p where p.name = d.name);
