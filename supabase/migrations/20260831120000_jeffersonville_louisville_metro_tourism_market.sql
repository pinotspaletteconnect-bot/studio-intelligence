-- Treat Kentucky-side Louisville metro ZIPs as Jeffersonville's local market.
-- County membership follows the July 2023 OMB/Census CBSA delineation for
-- Louisville/Jefferson County, KY-IN (CBSA 31140). ZIPs use the dashboard's
-- bundled ZIP-to-county reference so report classification stays consistent.
begin;

update public.studio_integrations integration
set configuration = coalesce(integration.configuration, '{}'::jsonb) || jsonb_build_object(
  'tourism_local_market', jsonb_build_object(
    'name', 'Louisville metro (Kentucky side)',
    'definition', 'Kentucky ZIP codes assigned to Bullitt, Jefferson, Oldham, Shelby, and Spencer counties in the Louisville/Jefferson County, KY-IN metropolitan statistical area. Henry, Meade, and Nelson counties remain tourism.',
    'source', 'U.S. Census Bureau July 2023 CBSA delineation (CBSA 31140); ZIP-to-county assignments from zipcodes-us 1.1.3.',
    'zip_codes', to_jsonb(array[
      '40003','40010','40014','40018','40022','40023','40025','40026','40027','40031','40032','40041','40046','40047','40056','40059','40065','40066','40067','40071','40076','40077','40109','40110','40118','40129','40150','40165','40166','40201','40202','40203','40204','40205','40206','40207','40208','40209','40210','40211','40212','40213','40214','40215','40216','40217','40218','40219','40220','40221','40222','40223','40224','40225','40228','40229','40231','40232','40233','40241','40242','40243','40245','40250','40251','40252','40253','40255','40256','40257','40258','40259','40261','40266','40268','40269','40270','40272','40280','40281','40282','40283','40285','40287','40289','40290','40291','40292','40293','40294','40295','40296','40297','40298','40299'
    ]::text[])
  )
)
from public.studios studio
where studio.id = integration.studio_id
  and integration.integration_type = 'pts'
  and lower(studio.studio_name) = 'jeffersonville';

commit;
