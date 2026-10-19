begin;
insert into public.seating_chart_targets(id,studio_id,config,enabled)
values ('b338bb62-58b2-4824-b38f-88e677d42fa2'::uuid,1,'{"studioId":1,"accountId":1,"studioCode":"STM","isPrivate":false,"classId":"931955","spreadsheetId":"1h0X3zNWCxkG3p7x71LPeFBE-FbC5dLLVj0swto8KwiQ","masterSpreadsheetId":"1ktf-zV74f--JWaaPlrrtYgmbLVGI6ZJI9JdArrYootA","googleAccountEmail":"pinotsstmatthews@gmail.com","sheetId":0,"sheetName":"Seating Chart Main","rowLimit":1000,"allowPilotAdoption":true,"sourceLocationLabel":"Matthews","sourceRoomId":"21","allowedClassTypeIds":["100"]}'::jsonb,true)
on conflict(id) do nothing;
select id,studio_id,enabled,revision,jsonb_array_length(ledger) as ledger_count,
  config->>'classId' as class_id, config->>'spreadsheetId' as spreadsheet_id
from public.seating_chart_targets where id='b338bb62-58b2-4824-b38f-88e677d42fa2'::uuid;
commit;
