-- Read-only, non-secret project/account/column verification.
select jsonb_build_object(
  'database',current_database(),'databaseUser',current_user,'postgresVersion',version(),
  'targetsExist',to_regclass('public.seating_chart_targets') is not null,
  'runsExist',to_regclass('public.seating_chart_refresh_runs') is not null,
  'studios',(select jsonb_agg(jsonb_build_object('id',s.id,'organizationId',s.organization_id,
    'code',to_jsonb(s)->>'code','name',to_jsonb(s)->>'name')) from public.studios s),
  'ptsAccounts',(select jsonb_agg(jsonb_build_object('id',a.id,'organizationId',a.organization_id,
    'name',a.account_name,'active',a.is_active,'secretReference',a.secret_reference)) from public.pts_integration_accounts a),
  'ptsMappings',(select jsonb_agg(jsonb_build_object('studioId',i.studio_id,'organizationId',i.organization_id,
    'locationId',i.external_id,'active',i.is_active,'accountId',i.configuration->>'account_id',
    'credentialReference',i.configuration->>'credential_reference')) from public.studio_integrations i where i.integration_type='pts'),
  'schemaColumns',(select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',data_type))
    from information_schema.columns where table_schema='public' and table_name in ('studios','pts_integration_accounts','studio_integrations')
    and column_name in ('id','organization_id','studio_id','configuration','is_active','secret_reference'))
) as preflight;
