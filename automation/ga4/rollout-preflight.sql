-- READ ONLY. Run in the verified Studio Intelligence Supabase SQL editor.
-- Never select Vault credentials, tokens or account-email fields.
select to_regclass('public.ga4_party_funnel_configs') as configs,
       to_regclass('public.ga4_party_funnel_periods') as periods,
       to_regclass('public.ga4_party_funnel_reporting') as reporting;

select account_id, studio_id, studio_code, studio_name, property_id, timezone,
       organization_id, brand_id, integration_id
from public.ga4_collection_targets
where property_id = '354847068'
order by studio_id, account_id;

-- Expected: all three proposed objects absent, and an explicitly verified
-- St. Matthews active target/account for this property. If absent/ambiguous,
-- stop before creating config or deploying; do not guess identities.
