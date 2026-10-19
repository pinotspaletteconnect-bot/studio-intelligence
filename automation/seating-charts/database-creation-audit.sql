-- Read-only metadata; no guest or host contact data.
select s.studio_id,s.enabled,s.schedule_enabled,
 coalesce((select jsonb_agg(jsonb_build_object('group_id',w.id,'state',w.state,'file_id',w.file_id,
 'event_count',(select count(*)from public.seating_chart_workbook_events d where d.workbook_id=w.id),
 'private_count',(select count(*)from public.seating_chart_workbook_events d where d.workbook_id=w.id and d.is_private),
 'target_count',(select count(*)from public.seating_chart_targets t where t.workbook_id=w.id),
 'lease_held',w.lease_run_id is not null,'result',w.result))from public.seating_chart_workbooks w where w.studio_id=s.studio_id),'[]')as workbooks
from public.seating_chart_creation_settings s where s.studio_id=1;
