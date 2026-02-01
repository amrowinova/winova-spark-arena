-- Update handle_new_user function to include location and referral logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  referrer_profile_id UUID := NULL;
  user_country TEXT;
  user_city TEXT;
  user_district TEXT;
  provided_referral_code TEXT;
BEGIN
  -- Extract metadata
  user_country := COALESCE(NEW.raw_user_meta_data->>'country', 'Saudi Arabia');
  user_city := COALESCE(NEW.raw_user_meta_data->>'city', NULL);
  user_district := COALESCE(NEW.raw_user_meta_data->>'district', NULL);
  provided_referral_code := UPPER(COALESCE(NEW.raw_user_meta_data->>'referral_code', ''));

  -- Try to find referrer by provided referral code
  IF provided_referral_code IS NOT NULL AND provided_referral_code != '' THEN
    SELECT id INTO referrer_profile_id
    FROM public.profiles
    WHERE referral_code = provided_referral_code
    LIMIT 1;
  END IF;

  -- If no referral code provided or not found, try to find most active user in same district
  IF referrer_profile_id IS NULL AND user_district IS NOT NULL THEN
    SELECT id INTO referrer_profile_id
    FROM public.profiles
    WHERE city = user_district  -- district is stored in city for granularity
    AND user_id != NEW.id
    ORDER BY activity_percentage DESC, created_at ASC
    LIMIT 1;
  END IF;

  -- If still no referrer, try most active in same city
  IF referrer_profile_id IS NULL AND user_city IS NOT NULL THEN
    SELECT id INTO referrer_profile_id
    FROM public.profiles
    WHERE city = user_city
    AND user_id != NEW.id
    ORDER BY activity_percentage DESC, created_at ASC
    LIMIT 1;
  END IF;

  -- If still no referrer, try most active in same country
  IF referrer_profile_id IS NULL AND user_country IS NOT NULL THEN
    SELECT id INTO referrer_profile_id
    FROM public.profiles
    WHERE country = user_country
    AND user_id != NEW.id
    ORDER BY activity_percentage DESC, created_at ASC
    LIMIT 1;
  END IF;

  -- If still no referrer, get the most active user in the entire app
  IF referrer_profile_id IS NULL THEN
    SELECT id INTO referrer_profile_id
    FROM public.profiles
    WHERE user_id != NEW.id
    ORDER BY activity_percentage DESC, created_at ASC
    LIMIT 1;
  END IF;

  -- Create profile with location and referrer
  INSERT INTO public.profiles (user_id, name, username, referral_code, country, city, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    'WINOVA-' || upper(substr(md5(random()::text), 1, 6)),
    user_country,
    COALESCE(user_city, user_district),
    referrer_profile_id
  );
  
  -- Create wallet with initial balance
  INSERT INTO public.wallets (user_id, nova_balance, aura_balance)
  VALUES (NEW.id, 0, 0);
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- If we have a referrer, add to team_members
  IF referrer_profile_id IS NOT NULL THEN
    INSERT INTO public.team_members (leader_id, member_id, level)
    SELECT p.user_id, NEW.id, 1
    FROM public.profiles p
    WHERE p.id = referrer_profile_id;
  END IF;
  
  RETURN NEW;
END;
$function$;