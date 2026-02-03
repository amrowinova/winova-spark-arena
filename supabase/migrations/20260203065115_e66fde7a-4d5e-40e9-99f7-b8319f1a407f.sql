-- Grant execute permission on execute_transfer to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_transfer(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_amount NUMERIC,
  p_currency currency_type,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_description TEXT,
  p_description_ar TEXT
) TO authenticated;

-- Also grant to anon for edge cases (will still fail auth checks inside)
GRANT EXECUTE ON FUNCTION public.execute_transfer(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_amount NUMERIC,
  p_currency currency_type,
  p_reference_type TEXT,
  p_reference_id UUID,
  p_description TEXT,
  p_description_ar TEXT
) TO anon;