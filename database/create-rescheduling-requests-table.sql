-- Create rescheduling_requests table and policies (corrected)
-- Notes:
-- - Fixed PL/pgSQL variable name conflict with reserved current_timestamp
-- - Added TO clauses to RLS policies and removed auth.role() usage
-- - Added security_invoker to view
-- - Hardened functions with set search_path = ''
-- - Kept UUID PK; ensure extensions.pgcrypto is installed for gen_random_uuid()

-- Create table
create table if not exists public.rescheduling_requests (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid not null references public.bookings(id) on delete cascade,
    customer_id integer not null references public.customers(id) on delete cascade,

    -- Original appointment details
    original_appointment_date date not null,
    original_appointment_time time not null,

    -- Requested new appointment details
    requested_appointment_date date not null,
    requested_appointment_time time not null,

    -- Request details
    reschedule_reason text,
    customer_notes text,

    -- Approval workflow
    status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
    admin_notes text,
    admin_user_id uuid,

    -- Timestamps
    requested_at timestamp with time zone default now(),
    processed_at timestamp with time zone,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_rescheduling_requests_booking_id on public.rescheduling_requests(booking_id);
create index if not exists idx_rescheduling_requests_customer_id on public.rescheduling_requests(customer_id);
create index if not exists idx_rescheduling_requests_status on public.rescheduling_requests(status);
create index if not exists idx_rescheduling_requests_requested_at on public.rescheduling_requests(requested_at);

-- Trigger to maintain updated_at
create or replace function public.update_rescheduling_requests_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_update_rescheduling_requests_updated_at on public.rescheduling_requests;
create trigger trigger_update_rescheduling_requests_updated_at
  before update on public.rescheduling_requests
  for each row
  execute function public.update_rescheduling_requests_updated_at();

-- Comments
comment on table public.rescheduling_requests is 'Stores customer rescheduling requests that require admin approval';
comment on column public.rescheduling_requests.status is 'Status of the rescheduling request: pending, approved, rejected, cancelled';
comment on column public.rescheduling_requests.original_appointment_date is 'Original appointment date before rescheduling';
comment on column public.rescheduling_requests.original_appointment_time is 'Original appointment time before rescheduling';
comment on column public.rescheduling_requests.requested_appointment_date is 'Customer requested new appointment date';
comment on column public.rescheduling_requests.requested_appointment_time is 'Customer requested new appointment time';
comment on column public.rescheduling_requests.admin_user_id is 'ID of admin user who processed this request';

-- Enable RLS
alter table public.rescheduling_requests enable row level security;

-- RLS Policies
-- Customers can view their own rescheduling requests
create policy "Customers can view own rescheduling requests" on public.rescheduling_requests
  for select to authenticated
  using (
    (select auth.uid()) = (
      select auth_user_id from public.customers where id = rescheduling_requests.customer_id
    )
  );

-- Customers can create rescheduling requests for their own bookings
create policy "Customers can create own rescheduling requests" on public.rescheduling_requests
  for insert to authenticated
  with check (
    (select auth.uid()) = (
      select auth_user_id from public.customers where id = rescheduling_requests.customer_id
    )
  );

-- Customers can update their own pending requests (to cancel them)
create policy "Customers can update own pending requests" on public.rescheduling_requests
  for update to authenticated
  using (
    (select auth.uid()) = (
      select auth_user_id from public.customers where id = rescheduling_requests.customer_id
    ) and status = 'pending'
  )
  with check (
    status in ('pending','cancelled')
  );

-- Admin (for now: any authenticated user) can view all
create policy "Admins can view all rescheduling requests" on public.rescheduling_requests
  for select to authenticated
  using (true);

-- Admin (for now: any authenticated user) can update any
create policy "Admins can update rescheduling requests" on public.rescheduling_requests
  for update to authenticated
  using (true)
  with check (true);

-- Function to check if rescheduling is allowed (24-hour rule)
create or replace function public.can_reschedule_booking(
  booking_appointment_date date,
  booking_appointment_time time
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  appointment_datetime timestamptz;
  now_ts timestamptz;
  delta interval;
begin
  -- Combine date and time to get full appointment timestamptz (assumes server/session timezone)
  appointment_datetime := (booking_appointment_date::timestamp + booking_appointment_time)::timestamptz;
  now_ts := now();
  delta := appointment_datetime - now_ts;
  return extract(epoch from delta) > (24 * 3600);
end;
$$;

comment on function public.can_reschedule_booking is 'Checks if a booking can be rescheduled (must be at least 24 hours before appointment)';

-- View with security_invoker
create or replace view public.rescheduling_requests_with_details
with (security_invoker=on)
as
select
  rr.*,
  b.booking_reference,
  b.package_name,
  b.status as booking_status,
  (c.first_name || ' ' || c.last_name) as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  public.can_reschedule_booking(rr.original_appointment_date, rr.original_appointment_time) as can_reschedule
from public.rescheduling_requests rr
join public.bookings b on rr.booking_id = b.id
join public.customers c on rr.customer_id = c.id;

comment on view public.rescheduling_requests_with_details is 'View that combines rescheduling requests with booking and customer details';

-- Verification
select 'Rescheduling requests table created successfully' as status;

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'rescheduling_requests'
order by ordinal_position;