-- ========================================
-- 1. ADD DELIVERED_AT TO DIRECT_MESSAGES
-- ========================================
ALTER TABLE public.direct_messages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- ========================================
-- 2. ADD LAST_SEEN TO PROFILES
-- ========================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- ========================================
-- 3. CREATE RPC FOR WALLET HISTORY
-- ========================================
CREATE OR REPLACE FUNCTION public.get_wallet_history(
  p_user_id UUID,
  p_currency TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  entry_type TEXT,
  currency TEXT,
  amount NUMERIC,
  balance_before NUMERIC,
  balance_after NUMERIC,
  description TEXT,
  description_ar TEXT,
  reference_type TEXT,
  reference_id UUID,
  counterparty_id UUID,
  counterparty_name TEXT,
  counterparty_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wl.id,
    wl.entry_type::TEXT,
    wl.currency::TEXT,
    wl.amount,
    wl.balance_before,
    wl.balance_after,
    wl.description,
    wl.description_ar,
    wl.reference_type,
    wl.reference_id,
    wl.counterparty_id,
    p.name AS counterparty_name,
    p.username AS counterparty_username,
    wl.created_at,
    wl.metadata
  FROM wallet_ledger wl
  LEFT JOIN profiles p ON p.user_id = wl.counterparty_id
  WHERE wl.user_id = p_user_id
    AND (p_currency IS NULL OR wl.currency::TEXT = p_currency)
  ORDER BY wl.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ========================================
-- 4. CREATE RPC FOR TEAM HIERARCHY
-- ========================================
CREATE OR REPLACE FUNCTION public.get_team_hierarchy(
  p_leader_id UUID,
  p_max_depth INTEGER DEFAULT 5
)
RETURNS TABLE (
  member_id UUID,
  level INTEGER,
  name TEXT,
  username TEXT,
  avatar_url TEXT,
  rank TEXT,
  weekly_active BOOLEAN,
  active_weeks INTEGER,
  direct_count BIGINT,
  parent_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE team_tree AS (
    -- Base case: direct members (level 1)
    SELECT 
      tm.member_id,
      tm.level,
      p.user_id AS parent_id
    FROM team_members tm
    JOIN profiles p ON p.user_id = tm.leader_id
    WHERE tm.leader_id = p_leader_id
    
    UNION ALL
    
    -- Recursive case: indirect members
    SELECT 
      tm.member_id,
      tt.level + 1,
      tm.leader_id AS parent_id
    FROM team_members tm
    JOIN team_tree tt ON tm.leader_id = tt.member_id
    WHERE tt.level < p_max_depth
  ),
  -- Count direct members for each user
  direct_counts AS (
    SELECT 
      leader_id,
      COUNT(*) AS cnt
    FROM team_members
    WHERE level = 1
    GROUP BY leader_id
  )
  SELECT 
    tt.member_id,
    tt.level,
    p.name,
    p.username,
    p.avatar_url,
    p.rank::TEXT,
    p.weekly_active,
    p.active_weeks,
    COALESCE(dc.cnt, 0) AS direct_count,
    tt.parent_id
  FROM team_tree tt
  JOIN profiles p ON p.user_id = tt.member_id
  LEFT JOIN direct_counts dc ON dc.leader_id = tt.member_id
  ORDER BY tt.level, p.name;
END;
$$;

-- ========================================
-- 5. CREATE RPC FOR UPDATING LAST SEEN
-- ========================================
CREATE OR REPLACE FUNCTION public.update_last_seen(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles 
  SET last_seen_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- ========================================
-- 6. CREATE RPC FOR MARKING MESSAGES DELIVERED
-- ========================================
CREATE OR REPLACE FUNCTION public.mark_messages_delivered(
  p_conversation_id UUID,
  p_recipient_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE direct_messages
  SET delivered_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND sender_id != p_recipient_id
    AND delivered_at IS NULL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ========================================
-- 7. ADD INDEX FOR FULL TEXT SEARCH ON MESSAGES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_direct_messages_content_search 
ON public.direct_messages USING gin(to_tsvector('arabic', content));

-- ========================================
-- 8. CREATE RPC FOR SEARCHING MESSAGES
-- ========================================
CREATE OR REPLACE FUNCTION public.search_messages(
  p_user_id UUID,
  p_query TEXT,
  p_conversation_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  sender_name TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  participant_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dm.id,
    dm.conversation_id,
    dm.sender_id,
    sender_p.name AS sender_name,
    dm.content,
    dm.created_at,
    CASE 
      WHEN c.participant1_id = p_user_id THEN p2.name
      ELSE p1.name
    END AS participant_name
  FROM direct_messages dm
  JOIN conversations c ON c.id = dm.conversation_id
  JOIN profiles sender_p ON sender_p.user_id = dm.sender_id
  LEFT JOIN profiles p1 ON p1.user_id = c.participant1_id
  LEFT JOIN profiles p2 ON p2.user_id = c.participant2_id
  WHERE (c.participant1_id = p_user_id OR c.participant2_id = p_user_id)
    AND (p_conversation_id IS NULL OR dm.conversation_id = p_conversation_id)
    AND (
      dm.content ILIKE '%' || p_query || '%'
      OR to_tsvector('arabic', dm.content) @@ plainto_tsquery('arabic', p_query)
    )
  ORDER BY dm.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ========================================
-- 9. GRANT FUNCTIONS TO PUBLIC
-- ========================================
GRANT EXECUTE ON FUNCTION public.get_wallet_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_hierarchy TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_last_seen TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_delivered TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_messages TO authenticated;