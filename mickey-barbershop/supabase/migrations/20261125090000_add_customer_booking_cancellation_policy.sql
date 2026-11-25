-- Customer self-service cancellation with authenticated ownership and the approved time policy.
-- Customers may cancel online bookings at least 2 hours before the appointment.
-- Inside the 2-hour window, cancellation is allowed only within 10 minutes of booking creation.
create or replace function public.cancel_customer_booking(p_booking_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_booking public.bookings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select b.*
    into v_booking
  from public.bookings b
  join public.customers c on c.id = b.customer_id
  where b.id = p_booking_id
    and c.auth_user_id = auth.uid()
  for update of b;

  if not found then
    raise exception 'Booking not found or does not belong to this account';
  end if;

  if v_booking.source <> 'Online'
     or v_booking.status not in ('Pending', 'Confirmed') then
    raise exception 'This booking cannot be cancelled online';
  end if;

  if v_booking.starts_at <= now() then
    raise exception 'An appointment that has already started cannot be cancelled';
  end if;

  if v_booking.starts_at < now() + interval '2 hours'
     and v_booking.created_at < now() - interval '10 minutes' then
    raise exception 'Within 2 hours of the appointment, cancellation is allowed only within 10 minutes after booking';
  end if;

  update public.bookings
  set status = 'Cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      cancellation_reason = 'Customer self-service cancellation',
      updated_at = now()
  where id = p_booking_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'customer_cancelled_booking',
    'booking',
    p_booking_id::text,
    jsonb_build_object(
      'source', 'Online',
      'previous_status', v_booking.status,
      'cancelled_at', now(),
      'policy', '2_hours_or_first_10_minutes'
    )
  );

  return true;
end;
$function$;

revoke all on function public.cancel_customer_booking(uuid) from public;
revoke all on function public.cancel_customer_booking(uuid) from anon;
grant execute on function public.cancel_customer_booking(uuid) to authenticated;
