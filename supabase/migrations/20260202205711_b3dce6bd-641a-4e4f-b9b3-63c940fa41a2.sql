-- Create a trigger function to insert a notification when someone follows a user
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_follower_name TEXT;
  v_follower_username TEXT;
BEGIN
  -- Get follower's name and username
  SELECT name, username INTO v_follower_name, v_follower_username
  FROM public.profiles
  WHERE user_id = NEW.follower_id
  LIMIT 1;

  -- Insert notification for the followed user
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    title_ar,
    message,
    message_ar,
    reference_id
  ) VALUES (
    NEW.following_id,
    'follow',
    'New Follower',
    'متابع جديد',
    COALESCE(v_follower_name, 'Someone') || ' (@' || COALESCE(v_follower_username, 'user') || ') started following you',
    'قام ' || COALESCE(v_follower_name, 'شخص ما') || ' (@' || COALESCE(v_follower_username, 'مستخدم') || ') بمتابعتك',
    NEW.id
  );

  RETURN NEW;
END;
$$;

-- Create the trigger on the follows table
DROP TRIGGER IF EXISTS on_follow_notify ON public.follows;
CREATE TRIGGER on_follow_notify
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_follow();

-- Allow follow notifications to be inserted by the trigger (since it's SECURITY DEFINER)
-- The notifications table already has RLS, but we need to allow the trigger to insert
-- No changes needed since the trigger runs as SECURITY DEFINER