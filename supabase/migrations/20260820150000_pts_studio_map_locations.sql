-- Store dashboard map locations alongside the existing PTS studio configuration.
-- This adds no new table or column and keeps business-specific addresses out of UI code.
begin;

with locations(studio_id, address, latitude, longitude) as (
  values
    (1::bigint, '291 N Hubbards Lane, Suite 110, Louisville, KY 40207'::text, 38.258796136949::numeric, -85.640138007687::numeric),
    (2::bigint, '691 N High Street, Columbus, OH 43215'::text, 39.976570399956::numeric, -83.003491733958::numeric),
    (3::bigint, '2743 S Market Street, Gilbert, AZ 85295'::text, 33.299994545407::numeric, -111.744092573295::numeric),
    (4::bigint, '300 Spring Street, Jeffersonville, IN 47130'::text, 38.271932369805::numeric, -85.740378372206::numeric)
)
update public.studio_integrations integration
set configuration = coalesce(integration.configuration, '{}'::jsonb) || jsonb_build_object(
  'map_location', jsonb_build_object(
    'address', locations.address,
    'latitude', locations.latitude,
    'longitude', locations.longitude
  )
)
from locations
where integration.studio_id = locations.studio_id
  and integration.integration_type = 'pts';

commit;
