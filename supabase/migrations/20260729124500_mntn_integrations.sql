-- Non-secret MNTN advertiser-to-studio mappings.
-- API keys remain encrypted in n8n credentials and never enter Supabase.

begin;

insert into public.studio_integrations (
  organization_id,
  brand_id,
  studio_id,
  integration_type,
  integration_name,
  external_id,
  is_active,
  configuration
)
select
  mapping.organization_id,
  mapping.brand_id,
  mapping.studio_id,
  'mntn',
  mapping.integration_name,
  mapping.advertiser_id,
  true,
  jsonb_build_object(
    'attribution_window_days', 30,
    'refresh_window_days', 35
  )
from (
  values
    (1::bigint, 1::bigint, 3::bigint, 'Pinot''s Palette - Gilbert', '42795'),
    (1::bigint, 1::bigint, 1::bigint, 'Pinot''s Palette - Louisville, KY', '42797'),
    (1::bigint, 1::bigint, 2::bigint, 'Pinot''s Palette - Short North, OH', '42796')
) as mapping (
  organization_id,
  brand_id,
  studio_id,
  integration_name,
  advertiser_id
)
where not exists (
  select 1
  from public.studio_integrations existing
  where existing.integration_type = 'mntn'
    and existing.external_id = mapping.advertiser_id
);

commit;
