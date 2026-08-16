-- Feature Constant Contact traffic as a distinct source in GA4 marketing reporting.
-- Raw GA4 source/medium facts remain unchanged.

begin;

insert into public.marketing_reporting_sources
  (
    source, medium, display_name, vendor, marketing_type, traffic_category,
    reporting_group, visibility, group_label, sort_order, notes
  )
values
  ('constant contact', 'email', 'Constant Contact', 'Constant Contact',
    'Owned', 'Email', 'Email', 'Featured', null, 75,
    'Constant Contact campaign traffic tagged with the vendor display name'),
  ('constant_contact', 'email', 'Constant Contact', 'Constant Contact',
    'Owned', 'Email', 'Email', 'Featured', null, 75,
    'Constant Contact campaign traffic tagged with an underscored source'),
  ('constantcontact', 'email', 'Constant Contact', 'Constant Contact',
    'Owned', 'Email', 'Email', 'Featured', null, 75,
    'Constant Contact campaign traffic tagged with a compact source'),
  ('r20.rs6.net', 'referral', 'Constant Contact', 'Constant Contact',
    'Owned', 'Email', 'Email', 'Featured', null, 75,
    'Constant Contact tracked-link redirect traffic'),
  ('conta.cc', 'referral', 'Constant Contact', 'Constant Contact',
    'Owned', 'Email', 'Email', 'Featured', null, 75,
    'Constant Contact shortened-link referral traffic'),
  ('myemail.constantcontact.com', 'referral', 'Constant Contact', 'Constant Contact',
    'Owned', 'Email', 'Email', 'Featured', null, 75,
    'Constant Contact hosted-email referral traffic'),
  ('constantcontact.com', 'referral', 'Constant Contact', 'Constant Contact',
    'Owned', 'Email', 'Email', 'Featured', null, 75,
    'Constant Contact web referral traffic')
on conflict do nothing;

commit;
