-- Customer-safe read-only availability. No customer PII is returned.
create or replace function public.get_public_booking_availability(p_date date)
returns table (barber_id uuid, starts_at timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_date is null then
    raise exception 'A booking date is required';
  end if;

  return query
  select b.barber_id, b.starts_at, b.ends_at
  from public.bookings b
  where b.starts_at < ((p_date + 1)::timestamp at time zone 'Asia/Bangkok')
    and b.ends_at > (p_date::timestamp at time zone 'Asia/Bangkok')
    and coalesce(b.status::text, '') not in ('Cancelled', 'No Show');
end;
$$;

revoke all on function public.get_public_booking_availability(date) from public;
revoke all on function public.get_public_booking_availability(date) from anon;
grant execute on function public.get_public_booking_availability(date) to authenticated;
