-- Add foreign key relationships between p2p_orders and profiles
-- Since creator_id and executor_id reference auth.users, we need to join through the user_id column

-- Create a view to make it easier to query orders with profiles
CREATE OR REPLACE VIEW public.p2p_orders_with_profiles AS
SELECT 
  o.*,
  cp.id as creator_profile_id,
  cp.name as creator_name,
  cp.username as creator_username,
  cp.avatar_url as creator_avatar_url,
  cp.country as creator_country,
  ep.id as executor_profile_id,
  ep.name as executor_name,
  ep.username as executor_username,
  ep.avatar_url as executor_avatar_url,
  ep.country as executor_country
FROM public.p2p_orders o
LEFT JOIN public.profiles cp ON o.creator_id = cp.user_id
LEFT JOIN public.profiles ep ON o.executor_id = ep.user_id;

-- Enable RLS on the view (inherits from base table)
-- Grant access to authenticated users
GRANT SELECT ON public.p2p_orders_with_profiles TO authenticated;

-- Add index for better performance on profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);