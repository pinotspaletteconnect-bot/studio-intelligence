-- Owner-confirmed St. Matthews defaults: adults8, kids10. No schema changes.
-- Rollback: remove only privatePartyFormMapping.minimumPaidSeats from config.
begin;
update public.seating_chart_creation_settings
set config=jsonb_set(config,'{privatePartyFormMapping,minimumPaidSeats}','{"adult":8,"kids":10,"partyTypes":{"Birthday - Adult":"adult","Birthday - Kid":"kids","Bachelorette":"adult","Corporate":"adult","Engagement":"adult","Baby Shower":"adult","Bridal Shower":"adult","Networking":"adult","Alumni":"adult"}}'::jsonb),updated_at=now()
where studio_id=1 and config->>'studioCode'='STM' and schedule_enabled=false;
commit;
