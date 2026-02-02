-- Update referral code generation function to use username + country
-- Format: WINOVA-{USERNAME}-{COUNTRY_CODE}

CREATE OR REPLACE FUNCTION public.generate_referral_code_v2(p_username TEXT, p_country TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  country_code TEXT;
BEGIN
  -- Map country names to 2-letter codes
  country_code := CASE 
    WHEN p_country ILIKE '%saudi%' THEN 'SA'
    WHEN p_country ILIKE '%egypt%' THEN 'EG'
    WHEN p_country ILIKE '%uae%' OR p_country ILIKE '%emirates%' THEN 'AE'
    WHEN p_country ILIKE '%kuwait%' THEN 'KW'
    WHEN p_country ILIKE '%qatar%' THEN 'QA'
    WHEN p_country ILIKE '%bahrain%' THEN 'BH'
    WHEN p_country ILIKE '%oman%' THEN 'OM'
    WHEN p_country ILIKE '%jordan%' THEN 'JO'
    WHEN p_country ILIKE '%iraq%' THEN 'IQ'
    WHEN p_country ILIKE '%lebanon%' THEN 'LB'
    WHEN p_country ILIKE '%syria%' THEN 'SY'
    WHEN p_country ILIKE '%morocco%' THEN 'MA'
    WHEN p_country ILIKE '%tunisia%' THEN 'TN'
    WHEN p_country ILIKE '%algeria%' THEN 'DZ'
    WHEN p_country ILIKE '%libya%' THEN 'LY'
    WHEN p_country ILIKE '%sudan%' THEN 'SD'
    WHEN p_country ILIKE '%yemen%' THEN 'YE'
    WHEN p_country ILIKE '%pakistan%' THEN 'PK'
    WHEN p_country ILIKE '%turkey%' THEN 'TR'
    WHEN p_country ILIKE '%iran%' THEN 'IR'
    WHEN p_country ILIKE '%united states%' OR p_country ILIKE '%usa%' THEN 'US'
    WHEN p_country ILIKE '%united kingdom%' OR p_country ILIKE '%uk%' THEN 'GB'
    WHEN p_country ILIKE '%germany%' THEN 'DE'
    WHEN p_country ILIKE '%france%' THEN 'FR'
    WHEN p_country ILIKE '%netherlands%' THEN 'NL'
    WHEN p_country ILIKE '%italy%' THEN 'IT'
    WHEN p_country ILIKE '%spain%' THEN 'ES'
    ELSE 'XX'
  END;
  
  -- Return formatted code: WINOVA-{USERNAME}-{COUNTRY_CODE}
  RETURN 'WINOVA-' || UPPER(p_username) || '-' || country_code;
END;
$$;

-- Update handle_new_user trigger to use new referral code format
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_profile_id UUID := NULL;
  user_country TEXT;
  user_city TEXT;
  user_district TEXT;
  user_username TEXT;
  user_name TEXT;
  provided_referral_code TEXT;
  generated_referral_code TEXT;
BEGIN
  -- Extract metadata
  user_country := COALESCE(NEW.raw_user_meta_data->>'country', 'Saudi Arabia');
  user_city := COALESCE(NEW.raw_user_meta_data->>'city', NULL);
  user_district := COALESCE(NEW.raw_user_meta_data->>'district', NULL);
  user_username := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8));
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', 'User');
  provided_referral_code := UPPER(COALESCE(NEW.raw_user_meta_data->>'referral_code', ''));

  -- Generate referral code in format WINOVA-{USERNAME}-{COUNTRY_CODE}
  generated_referral_code := generate_referral_code_v2(user_username, user_country);

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
    WHERE city = user_district
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
  INSERT INTO public.profiles (user_id, name, username, referral_code, country, city, referred_by, wallet_country)
  VALUES (
    NEW.id,
    user_name,
    user_username,
    generated_referral_code,
    user_country,
    COALESCE(user_city, user_district),
    referrer_profile_id,
    user_country
  );
  
  -- Create wallet with ZERO balances (strict zero-state)
  INSERT INTO public.wallets (user_id, nova_balance, aura_balance, locked_nova_balance)
  VALUES (NEW.id, 0, 0, 0);
  
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
$$;