-- ══════════════════════════════════════════════════════════════════════════════
-- P2P MESSAGE CONTENT FILTER
-- Blocks external links and financial data in P2P chat messages.
-- Applied as a BEFORE INSERT trigger — rejects forbidden content at the DB level.
-- System messages (is_system_message = true) are always allowed.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.p2p_message_content_filter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_text TEXT;
BEGIN
  -- System messages are always allowed
  IF NEW.is_system_message = true THEN
    RETURN NEW;
  END IF;

  -- Image-type messages are allowed (no text to filter)
  IF NEW.message_type = 'image' THEN
    RETURN NEW;
  END IF;

  -- Combine content fields for checking
  v_text := LOWER(COALESCE(NEW.content, '') || ' ' || COALESCE(NEW.content_ar, ''));

  -- ── Block external links ──────────────────────────────────────────────────
  -- Matches http/https URLs, Telegram, WhatsApp, and common link shorteners
  IF v_text ~* '(https?://|t\.me/|telegram\.me/|wa\.me/|whatsapp\.com|bit\.ly|tinyurl\.com|shorturl\.|linktr\.ee)' THEN
    RAISE EXCEPTION 'blocked:external_link'
      USING HINT = 'External links are not allowed in P2P chat';
  END IF;

  -- ── Block IBAN numbers ────────────────────────────────────────────────────
  -- Matches international IBAN patterns (2 letters + 2 digits + 10-30 alphanumeric)
  -- Covers: SA, AE, KW, BH, QA, JO, EG, GB, DE, FR, etc.
  IF v_text ~* '[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}' THEN
    RAISE EXCEPTION 'blocked:financial_data'
      USING HINT = 'Financial data (IBAN) is not allowed in P2P chat';
  END IF;

  -- ── Block long digit sequences (account/card numbers) ────────────────────
  -- 12+ consecutive digits (bank account numbers, card numbers)
  -- Allows normal amounts like "500" or "1000000" — only blocks raw account-like numbers
  IF v_text ~ '[0-9]{12,}' THEN
    RAISE EXCEPTION 'blocked:financial_data'
      USING HINT = 'Financial data (account number) is not allowed in P2P chat';
  END IF;

  -- ── Block phone numbers that look like transfer destinations ─────────────
  -- Patterns: +966XXXXXXXXX, 00966XXXXXXXXX, +971XXXXXXXXX etc.
  -- (local short numbers like "1234" are fine — this only blocks international-format numbers)
  IF v_text ~ '(\+|00)[0-9]{10,14}' THEN
    RAISE EXCEPTION 'blocked:financial_data'
      USING HINT = 'Phone numbers in international format are not allowed in P2P chat';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to p2p_messages
DROP TRIGGER IF EXISTS trg_p2p_message_filter ON public.p2p_messages;

CREATE TRIGGER trg_p2p_message_filter
  BEFORE INSERT ON public.p2p_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.p2p_message_content_filter();
