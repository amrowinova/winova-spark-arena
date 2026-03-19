-- Supervisor change request system
-- Users can request to change their direct supervisor (referrer)
-- Admin approves or rejects the request

create table if not exists public.supervisor_change_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- current referrer at the time of the request
  current_supervisor_id uuid references auth.users(id) on delete set null,
  -- requested new supervisor (by referral code)
  requested_supervisor_id uuid not null references auth.users(id) on delete cascade,
  requested_supervisor_code text not null,
  reason      text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Only one pending request per user at a time
create unique index if not exists supervisor_change_requests_user_pending
  on public.supervisor_change_requests (user_id)
  where status = 'pending';

-- Row Level Security
alter table public.supervisor_change_requests enable row level security;

-- Users can read their own requests
create policy "users_read_own_requests"
  on public.supervisor_change_requests for select
  using (auth.uid() = user_id);

-- Users can insert their own requests
create policy "users_insert_own_requests"
  on public.supervisor_change_requests for insert
  with check (auth.uid() = user_id);

-- Admins can read all (via service role / admin panel)
-- Handled by service key in admin functions

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger supervisor_change_requests_updated_at
  before update on public.supervisor_change_requests
  for each row execute function public.set_updated_at();

-- RPC: Submit a supervisor change request
create or replace function public.submit_supervisor_change_request(
  p_user_id          uuid,
  p_new_referral_code text,
  p_reason           text default null
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_new_supervisor profiles%rowtype;
  v_current_supervisor_id uuid;
  v_existing_pending uuid;
begin
  -- Validate caller
  if auth.uid() != p_user_id then
    return jsonb_build_object('success', false, 'error', 'Unauthorized');
  end if;

  -- Find the requested supervisor by referral code
  select * into v_new_supervisor
  from public.profiles
  where referral_code = upper(p_new_referral_code)
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Invalid referral code');
  end if;

  -- Cannot request yourself
  if v_new_supervisor.user_id = p_user_id then
    return jsonb_build_object('success', false, 'error', 'Cannot set yourself as supervisor');
  end if;

  -- Get current supervisor
  select referred_by into v_current_supervisor_id
  from public.profiles
  where user_id = p_user_id;

  -- Cannot request current supervisor
  if v_current_supervisor_id = v_new_supervisor.user_id then
    return jsonb_build_object('success', false, 'error', 'This is already your supervisor');
  end if;

  -- Check for existing pending request
  select id into v_existing_pending
  from public.supervisor_change_requests
  where user_id = p_user_id and status = 'pending';

  if found then
    return jsonb_build_object('success', false, 'error', 'You already have a pending request');
  end if;

  -- Insert the request
  insert into public.supervisor_change_requests
    (user_id, current_supervisor_id, requested_supervisor_id, requested_supervisor_code, reason)
  values
    (p_user_id, v_current_supervisor_id, v_new_supervisor.user_id, upper(p_new_referral_code), p_reason);

  return jsonb_build_object(
    'success', true,
    'supervisor_name', v_new_supervisor.name
  );
end;
$$;

-- RPC: Get user's supervisor change requests
create or replace function public.get_my_supervisor_requests(p_user_id uuid)
returns table (
  id uuid,
  requested_supervisor_name text,
  requested_supervisor_code text,
  reason text,
  status text,
  admin_note text,
  created_at timestamptz
)
language sql security definer
as $$
  select
    r.id,
    p.name as requested_supervisor_name,
    r.requested_supervisor_code,
    r.reason,
    r.status,
    r.admin_note,
    r.created_at
  from public.supervisor_change_requests r
  join public.profiles p on p.user_id = r.requested_supervisor_id
  where r.user_id = p_user_id
  order by r.created_at desc
  limit 10;
$$;
