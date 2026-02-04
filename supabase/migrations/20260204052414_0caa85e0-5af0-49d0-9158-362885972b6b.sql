-- Step 2: Insert Screen-based AI Owners
INSERT INTO public.ai_agents (agent_name, agent_name_ar, agent_role, focus_areas, behavior_description, is_active)
VALUES 
  ('Home Screen Owner', 'مالك شاشة الرئيسية', 'screen_home_owner', 
   ARRAY['home_logic', 'dashboard_data', 'realtime_stats', 'navigation_flow'],
   'Owns Home screen logic: Active users, rankings, contest cards, navigation to other screens. Detects data sync issues.', true),
   
  ('Wallet Screen Owner', 'مالك شاشة المحفظة', 'screen_wallet_owner',
   ARRAY['wallet_display', 'balance_sync', 'transaction_history', 'ledger_ui'],
   'Owns Wallet screen logic: Balance display accuracy, ledger sync, transaction cards, frozen wallet states.', true),
   
  ('P2P Screen Owner', 'مالك شاشة P2P', 'screen_p2p_owner',
   ARRAY['marketplace_orders', 'order_creation', 'order_matching', 'status_display'],
   'Owns P2P marketplace logic: Order cards, status transitions, timer display, country filtering.', true),
   
  ('P2P Chat Screen Owner', 'مالك شاشة شات P2P', 'screen_p2p_chat_owner',
   ARRAY['p2p_chat_flow', 'payment_steps', 'dispute_files', 'order_actions'],
   'Owns P2P Chat logic: Payment flow steps, action buttons, dispute file uploads, timer countdown.', true),
   
  ('DM Chat Screen Owner', 'مالك شاشة الرسائل', 'screen_dm_chat_owner',
   ARRAY['direct_messages', 'conversation_list', 'message_delivery', 'typing_indicators'],
   'Owns DM Chat logic: Message delivery, read receipts, realtime sync, conversation ordering.', true),
   
  ('Contests Screen Owner', 'مالك شاشة المسابقات', 'screen_contests_owner',
   ARRAY['contest_display', 'voting_logic', 'entry_flow', 'prize_distribution'],
   'Owns Contests logic: Entry requirements, voting mechanics, timer accuracy, prize calculations.', true),
   
  ('Profile Screen Owner', 'مالك شاشة البروفايل', 'screen_profile_owner',
   ARRAY['profile_data', 'stats_display', 'followers_logic', 'p2p_reputation'],
   'Owns Profile logic: User stats accuracy, followers sync, reputation display, wins history.', true),
   
  ('Team Screen Owner', 'مالك شاشة الفريق', 'screen_team_owner',
   ARRAY['team_hierarchy', 'referral_logic', 'rank_display', 'member_stats'],
   'Owns Team logic: Hierarchy accuracy, referral chains, rank progression, activity percentages.', true),
   
  ('Admin Panel Owner', 'مالك لوحة التحكم', 'screen_admin_owner',
   ARRAY['admin_workflows', 'user_management', 'wallet_operations', 'support_tools'],
   'Owns Admin Panel logic: Bulk operations safety, audit completeness, role permissions, moderation tools.', true)
ON CONFLICT DO NOTHING;