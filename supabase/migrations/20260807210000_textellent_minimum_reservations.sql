-- Express the low-enrollment threshold as an exclusive minimum.
-- Existing maximum value 2 becomes minimum value 3 with identical behavior.

begin;

drop view public.low_reservation_class_alert_targets;

alter table public.low_reservation_class_alert_settings
  rename column maximum_reservations to minimum_reservations;

alter table public.low_reservation_class_alert_settings
  alter column minimum_reservations set default 3;

update public.low_reservation_class_alert_settings
set minimum_reservations = minimum_reservations + 1;

alter table public.low_reservation_class_alert_settings
  drop constraint low_reservation_threshold,
  add constraint low_reservation_threshold check (minimum_reservations between 2 and 21);

create view public.low_reservation_class_alert_targets as
select
  setting.organization_id,
  setting.studio_id,
  studio.studio_code,
  studio.studio_name,
  studio.timezone,
  pts.external_id as pts_location_id,
  (pts.configuration ->> 'pts_account_id')::bigint as pts_account_id,
  assignment.textellent_account_id,
  textellent.sender_number,
  setting.enabled,
  setting.minimum_reservations,
  setting.lead_hours,
  setting.earliest_send_time,
  setting.message_template,
  setting.excluded_class_types,
  setting.excluded_title_patterns
from public.low_reservation_class_alert_settings setting
join public.studios studio on studio.id = setting.studio_id and studio.organization_id = setting.organization_id and studio.active
join public.studio_integrations pts on pts.studio_id = studio.id and pts.integration_type = 'pts' and pts.is_active
join public.textellent_studio_assignments assignment on assignment.studio_id = studio.id and assignment.organization_id = setting.organization_id
join public.textellent_accounts textellent on textellent.id = assignment.textellent_account_id and textellent.organization_id = setting.organization_id and textellent.is_active;

revoke all on table public.low_reservation_class_alert_targets from public, anon, authenticated;
grant select on table public.low_reservation_class_alert_targets to service_role;

comment on column public.low_reservation_class_alert_settings.minimum_reservations is
  'Exclusive enrollment threshold. A value of 3 alerts classes with 1 or 2 reservations; zero-reservation classes are skipped.';
comment on view public.low_reservation_class_alert_targets is
  'Service-only joined PTS/Textellent routing and studio rule configuration; secret values are resolved separately.';

commit;
