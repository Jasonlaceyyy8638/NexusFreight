-- Background location ingest from the device (Android WorkManager / iOS background task).
-- The device identifies itself by its push token stored in `driver_push_tokens.expo_push_token`.
-- This avoids needing an interactive Supabase auth session on the device to update `driver_locations`.

begin;

create or replace function public.driver_ingest_location_from_device(
  device_push_token text,
  lat double precision,
  lng double precision,
  accuracy_m double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid;
  v_org_id uuid;
  v_carrier_id uuid;
  v_now timestamptz := now();
begin
  if device_push_token is null or length(trim(device_push_token)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'missing_token');
  end if;

  select dpt.driver_id, dpt.org_id, dpt.carrier_id
    into v_driver_id, v_org_id, v_carrier_id
  from public.driver_push_tokens dpt
  where dpt.expo_push_token = device_push_token
  order by dpt.updated_at desc
  limit 1;

  if v_driver_id is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown_token');
  end if;

  insert into public.driver_locations (
    driver_id, org_id, carrier_id, lat, lng, accuracy_m, recorded_at, updated_at
  )
  values (
    v_driver_id, v_org_id, v_carrier_id, lat, lng, accuracy_m, v_now, v_now
  )
  on conflict (driver_id) do update set
    lat = excluded.lat,
    lng = excluded.lng,
    accuracy_m = excluded.accuracy_m,
    recorded_at = excluded.recorded_at,
    updated_at = excluded.updated_at;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.driver_ingest_location_from_device(text, double precision, double precision, double precision) from public;
grant execute on function public.driver_ingest_location_from_device(text, double precision, double precision, double precision) to anon, authenticated;

commit;

