
-- Backfill script: Populate team_members from existing profiles.referred_by
-- Step 1: Insert direct (level=1) relationships from profiles.referred_by
INSERT INTO team_members (leader_id, member_id, level)
SELECT 
  referrer.user_id AS leader_id,
  p.user_id AS member_id,
  1 AS level
FROM profiles p
JOIN profiles referrer ON referrer.id = p.referred_by
WHERE p.referred_by IS NOT NULL
ON CONFLICT (leader_id, member_id) DO NOTHING;

-- Step 2: Recursive CTE to generate all indirect relationships (closure table)
-- This will iterate up to 10 levels deep
WITH RECURSIVE ancestry AS (
  -- Base case: direct relationships (level 1)
  SELECT 
    tm.leader_id,
    tm.member_id,
    tm.level,
    tm.leader_id AS original_leader
  FROM team_members tm
  WHERE tm.level = 1
  
  UNION ALL
  
  -- Recursive case: find ancestors of leaders
  SELECT 
    parent_tm.leader_id,
    ancestry.member_id,
    ancestry.level + 1 AS level,
    ancestry.original_leader
  FROM ancestry
  JOIN team_members parent_tm ON parent_tm.member_id = ancestry.leader_id
  WHERE parent_tm.level = 1
    AND ancestry.level < 10
)
INSERT INTO team_members (leader_id, member_id, level)
SELECT DISTINCT
  ancestry.leader_id,
  ancestry.member_id,
  ancestry.level
FROM ancestry
WHERE ancestry.level > 1
  AND ancestry.leader_id <> ancestry.member_id
ON CONFLICT (leader_id, member_id) DO NOTHING;

-- Log the backfill operation
INSERT INTO audit_logs (action, entity_type, performed_by, metadata)
SELECT 
  'team_members_backfill',
  'team_members',
  (SELECT user_id FROM profiles LIMIT 1),
  jsonb_build_object(
    'total_direct_links', (SELECT COUNT(*) FROM team_members WHERE level = 1),
    'total_indirect_links', (SELECT COUNT(*) FROM team_members WHERE level > 1),
    'backfill_date', NOW()
  );
