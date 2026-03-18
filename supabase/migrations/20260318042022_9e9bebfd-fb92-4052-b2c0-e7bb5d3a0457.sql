-- Update handle_new_user to generate cleaner usernames with uniqueness check
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name TEXT;
  v_username TEXT;
  v_country TEXT;
  v_city TEXT;
  v_district TEXT;
  v_provided_referral TEXT;
  v_referrer_id UUID;
  v_generated_ref TEXT;
  v_wallet_country TEXT;
  v_base_username TEXT;
  v_username_exists BOOLEAN;
  v_counter INT := 0;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', 'User');
  v_base_username := COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), NULL);
  v_country := COALESCE(NEW.raw_user_meta_data->>'country', 'Saudi Arabia');
  v_city := NEW.raw_user_meta_data->>'city';
  v_district := NEW.raw_user_meta_data->>'district';
  v_provided_referral := UPPER(COALESCE(NEW.raw_user_meta_data->>'referral_code', ''));
  v_wallet_country := v_country;

  -- Generate clean username if not provided
  IF v_base_username IS NULL THEN
    v_base_username := lower(regexp_replace(v_name, '[^a-zA-Z0-9]', '', 'g'));
    IF v_base_username = '' OR length(v_base_username) < 2 THEN
      v_base_username := 'user' || substr(NEW.id::text, 1, 8);
    END IF;
  END IF;

  -- Ensure username uniqueness
  v_username := v_base_username;
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = v_username) INTO v_username_exists;
    EXIT WHEN NOT v_username_exists;
    v_counter := v_counter + 1;
    v_username := v_base_username || v_counter::text;
  END LOOP;

  -- Generate referral code
  v_generated_ref := generate_referral_code_v2(v_username, v_country);

  -- Find referrer if referral code provided
  IF v_provided_referral <> '' THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = v_provided_referral;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (
    user_id, name, username, referral_code, country, city, district, wallet_country, referred_by
  ) VALUES (
    NEW.id, v_name, v_username, v_generated_ref, v_country,
    COALESCE(v_city, ''), COALESCE(v_district, ''), v_wallet_country, v_referrer_id
  );

  -- Insert wallet
  INSERT INTO public.wallets (user_id, nova_balance, aura_balance, locked_nova_balance)
  VALUES (NEW.id, 0, 0, 0);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;