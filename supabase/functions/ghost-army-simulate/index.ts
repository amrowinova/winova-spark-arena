import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
  test: string;
  category: string;
  status: 'pass' | 'fail' | 'warning';
  detail: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  latency_ms?: number;
  what_happened: string;
  why_it_matters: string;
  recommended_action: string;
}

interface BehavioralMetrics {
  follows_created: number;
  follows_failed: number;
  p2p_orders_created: number;
  p2p_orders_accepted: number;
  p2p_orders_cancelled: number;
  p2p_orders_completed: number;
  p2p_disputes: number;
  ratings_submitted: number;
  ratings_positive: number;
  ratings_negative: number;
  profiles_viewed: number;
  chats_started: number;
  messages_sent: number;
  referrals_attempted: number;
  referrals_succeeded: number;
}

function exec(
  base: Omit<TestResult, 'what_happened' | 'why_it_matters' | 'recommended_action'>,
  e: { what: string; why: string; action: string }
): TestResult {
  return { ...base, what_happened: e.what, why_it_matters: e.why, recommended_action: e.action };
}

function pick<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await adminClient.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: roles } = await adminClient.from('user_roles').select('role').eq('user_id', user.id);
      if (!roles?.some((r: any) => r.role === 'admin')) {
        return new Response(JSON.stringify({ error: 'Admin only' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    let body: any = {};
    try { body = await req.json(); } catch (_) {}
    const scenario: string = body.scenario || 'full';
    const safeMode: boolean = body.safe_mode !== false;
    const persistData: boolean = body.persist === true;

    const runSuite = (name: string) => scenario === 'full' || scenario === name;

    const { data: ghosts } = await adminClient
      .from('profiles').select('id, user_id, username, name, referral_code, referred_by')
      .like('username', 'ghost_agent_%').limit(200);

    if (!ghosts || ghosts.length === 0) {
      return new Response(JSON.stringify({ error: 'No ghost agents found.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: TestResult[] = [];
    const startTime = Date.now();
    const anonClient = createClient(supabaseUrl, anonKey);
    const agentCap = safeMode ? 10 : 30;
    const activeAgents = pick(ghosts, agentCap);

    const metrics: BehavioralMetrics = {
      follows_created: 0, follows_failed: 0,
      p2p_orders_created: 0, p2p_orders_accepted: 0,
      p2p_orders_cancelled: 0, p2p_orders_completed: 0, p2p_disputes: 0,
      ratings_submitted: 0, ratings_positive: 0, ratings_negative: 0,
      profiles_viewed: 0, chats_started: 0, messages_sent: 0,
      referrals_attempted: 0, referrals_succeeded: 0,
    };

    // ════════════════════════════════════════
    // SUITE: RLS & WALLET INTEGRITY (existing)
    // ════════════════════════════════════════
    if (runSuite('wallet')) {
      // Cross-user wallet access
      if (ghosts.length >= 2) {
        const ghostB = ghosts[1];
        const { data: otherWallet } = await anonClient
          .from('wallets').select('*').eq('user_id', ghostB.user_id).maybeSingle();
        results.push(exec({
          test: 'Cross-user wallet access', category: 'RLS_Security',
          status: otherWallet ? 'fail' : 'pass',
          detail: otherWallet ? `Anon read wallet of ${ghostB.username}.` : 'Anon blocked.',
          severity: otherWallet ? 'critical' : 'low',
        }, {
          what: otherWallet ? 'Unauthenticated request read another user\'s wallet.' : 'Unauthenticated wallet access blocked.',
          why: otherWallet ? 'External actors could view balances.' : 'Financial data properly isolated.',
          action: otherWallet ? 'Enforce RLS SELECT on wallets.' : 'No action needed.',
        }));
      }

      // Wallet existence & balance checks
      for (const ghost of activeAgents.slice(0, 5)) {
        const { data: wallet } = await adminClient
          .from('wallets').select('*').eq('user_id', ghost.user_id).maybeSingle();
        if (!wallet) {
          results.push(exec({
            test: `Wallet existence: ${ghost.username}`, category: 'Data_Integrity',
            status: 'fail', detail: `No wallet for ${ghost.username}`, severity: 'high',
          }, {
            what: `User ${ghost.username} has no wallet record.`,
            why: 'Users without wallets cannot participate in financial operations.',
            action: 'Investigate wallet provisioning trigger.',
          }));
        } else if (Number(wallet.nova_balance) < 0 || Number(wallet.aura_balance) < 0) {
          results.push(exec({
            test: `Negative balance: ${ghost.username}`, category: 'Data_Integrity',
            status: 'fail', detail: `Nova=${wallet.nova_balance}, Aura=${wallet.aura_balance}`, severity: 'critical',
          }, {
            what: `User ${ghost.username} has negative balance.`,
            why: 'Negative balances indicate exploit potential.',
            action: 'Enforce CHECK constraints on wallet balance columns.',
          }));
        }
      }

      // Overdraft test
      const { data: ogWallet } = await adminClient
        .from('wallets').select('nova_balance').eq('user_id', ghosts[0].user_id).single();
      if (ogWallet) {
        const { error: overdraftError } = await adminClient
          .from('wallets').update({ nova_balance: -(Number(ogWallet.nova_balance) + 9999) }).eq('user_id', ghosts[0].user_id);
        if (!overdraftError) {
          await adminClient.from('wallets').update({ nova_balance: ogWallet.nova_balance }).eq('user_id', ghosts[0].user_id);
        }
        results.push(exec({
          test: 'Overdraft protection', category: 'Financial_Safety',
          status: overdraftError ? 'pass' : 'fail',
          detail: overdraftError ? 'Database rejected negative balance.' : 'Negative balance accepted.',
          severity: overdraftError ? 'low' : 'critical',
        }, {
          what: overdraftError ? 'Overdraft rejected by CHECK constraint.' : 'Overdraft succeeded.',
          why: overdraftError ? 'Financial integrity protected.' : 'Attackers could extract unlimited funds.',
          action: overdraftError ? 'No action needed.' : 'URGENT: Add CHECK (nova_balance >= 0).',
        }));
      }
    }

    // ════════════════════════════════════════
    // SUITE: BEHAVIORAL — FOLLOWS
    // ════════════════════════════════════════
    if (runSuite('social') || runSuite('full')) {
      const followers = pick(activeAgents, safeMode ? 5 : 15);
      for (const agent of followers) {
        const target = pickOne(ghosts.filter(g => g.user_id !== agent.user_id));
        try {
          // Check if already following
          const { count } = await adminClient
            .from('follows').select('*', { count: 'exact', head: true })
            .eq('follower_id', agent.user_id).eq('following_id', target.user_id);

          if ((count || 0) === 0) {
            const { error } = await adminClient.from('follows').insert({
              follower_id: agent.user_id,
              following_id: target.user_id,
            });
            if (error) {
              metrics.follows_failed++;
            } else {
              metrics.follows_created++;
            }
          } else {
            metrics.follows_created++; // already exists, count it
          }
        } catch {
          metrics.follows_failed++;
        }

        // Profile view simulation
        const { data: profile } = await adminClient
          .from('profiles').select('id, username, name').eq('user_id', target.user_id).maybeSingle();
        if (profile) metrics.profiles_viewed++;
      }

      results.push(exec({
        test: `Social follows (${metrics.follows_created} created)`, category: 'Behavioral_Social',
        status: metrics.follows_failed > metrics.follows_created ? 'fail' : metrics.follows_failed > 0 ? 'warning' : 'pass',
        detail: `${metrics.follows_created} follows, ${metrics.follows_failed} failed, ${metrics.profiles_viewed} profiles viewed.`,
        severity: metrics.follows_failed > metrics.follows_created ? 'high' : 'low',
      }, {
        what: `Agents followed ${metrics.follows_created} users and viewed ${metrics.profiles_viewed} profiles.`,
        why: metrics.follows_failed > 0 ? 'Follow failures indicate RLS or schema issues.' : 'Social graph building works correctly.',
        action: metrics.follows_failed > 0 ? 'Check follows table RLS INSERT policy.' : 'No action needed.',
      }));
    }

    // ════════════════════════════════════════
    // SUITE: BEHAVIORAL — CHAT
    // ════════════════════════════════════════
    if (runSuite('chat') || runSuite('full')) {
      const chatPairs = pick(activeAgents, safeMode ? 6 : 16);
      let chatErrors = 0;
      const chatLatencies: number[] = [];

      for (let i = 0; i < chatPairs.length - 1; i += 2) {
        const sender = chatPairs[i];
        const receiver = chatPairs[i + 1];
        const chatStart = Date.now();

        // Find or create conversation
        const { data: existingConv } = await adminClient
          .from('conversations').select('id')
          .or(`and(participant1_id.eq.${sender.user_id},participant2_id.eq.${receiver.user_id}),and(participant1_id.eq.${receiver.user_id},participant2_id.eq.${sender.user_id})`)
          .maybeSingle();

        let conversationId = existingConv?.id;
        if (!conversationId) {
          const { data: newConv, error: convErr } = await adminClient.from('conversations').insert({
            participant1_id: sender.user_id,
            participant2_id: receiver.user_id,
          }).select('id').single();
          if (convErr) { chatErrors++; continue; }
          conversationId = newConv.id;
          metrics.chats_started++;
        }

        // Send 1-3 messages per conversation
        const msgCount = Math.floor(Math.random() * 3) + 1;
        for (let m = 0; m < msgCount; m++) {
          const msgSender = m % 2 === 0 ? sender : receiver;
          const phrases = [
            '[GHOST_TEST] مرحباً، كيف حالك؟',
            '[GHOST_TEST] هل الطلب جاهز؟',
            '[GHOST_TEST] شكراً لك!',
            '[GHOST_TEST] تم التحويل.',
            '[GHOST_TEST] أحتاج مساعدة.',
          ];
          const { error: msgError } = await adminClient.from('direct_messages').insert({
            conversation_id: conversationId,
            sender_id: msgSender.user_id,
            content: `${pickOne(phrases)} — ${Date.now()}`,
            message_type: 'text',
          });
          if (msgError) chatErrors++;
          else metrics.messages_sent++;
        }
        chatLatencies.push(Date.now() - chatStart);
      }

      const avgLatency = chatLatencies.length > 0
        ? Math.round(chatLatencies.reduce((a, b) => a + b, 0) / chatLatencies.length) : 0;

      results.push(exec({
        test: `Chat simulation (${metrics.messages_sent} msgs)`, category: 'Behavioral_Chat',
        status: chatErrors > 0 ? (chatErrors > metrics.messages_sent ? 'fail' : 'warning') : 'pass',
        detail: `${metrics.messages_sent} sent, ${chatErrors} failed, ${metrics.chats_started} new convos. Avg ${avgLatency}ms.`,
        severity: chatErrors > metrics.messages_sent ? 'high' : 'low',
        latency_ms: avgLatency,
      }, {
        what: `${metrics.messages_sent} messages delivered across ${metrics.chats_started} new conversations.`,
        why: chatErrors > 0 ? 'Message failures break user communication.' : 'Chat handles behavioral load correctly.',
        action: chatErrors > 0 ? 'Review direct_messages schema and RLS.' : 'No action needed.',
      }));
    }

    // ════════════════════════════════════════
    // SUITE: BEHAVIORAL — P2P TRADING LIFECYCLE
    // ════════════════════════════════════════
    if (runSuite('p2p') || runSuite('full')) {
      const traders = pick(activeAgents, safeMode ? 6 : 20);
      const p2pBudget = safeMode ? 10 : 50; // max Nova per order
      const createdOrderIds: string[] = [];

      // Step 1: Create sell orders (half the traders)
      const sellers = traders.slice(0, Math.floor(traders.length / 2));
      const buyers = traders.slice(Math.floor(traders.length / 2));

      for (const seller of sellers) {
        const amount = Math.floor(Math.random() * p2pBudget) + 1;
        const price = Math.round((Math.random() * 3 + 1) * 100) / 100;

        const { data: wallet } = await adminClient
          .from('wallets').select('nova_balance').eq('user_id', seller.user_id).single();

        if (!wallet || Number(wallet.nova_balance) < amount) continue;

        const { data: order, error } = await adminClient.from('p2p_orders').insert({
          creator_id: seller.user_id,
          order_type: 'sell',
          amount,
          price_per_unit: price,
          total_price: Math.round(amount * price * 100) / 100,
          currency: 'SAR',
          status: 'open',
          payment_method: 'bank_transfer',
          min_amount: 1,
          max_amount: amount,
          time_limit_minutes: 30,
        }).select('id').single();

        if (error) {
          results.push(exec({
            test: `P2P order creation: ${seller.username}`, category: 'Behavioral_P2P',
            status: 'fail', detail: error.message, severity: 'high',
          }, {
            what: `Failed to create sell order for ${seller.username}.`,
            why: 'Order creation failures block marketplace.',
            action: `Review p2p_orders schema: ${error.message}`,
          }));
        } else {
          createdOrderIds.push(order.id);
          metrics.p2p_orders_created++;
        }
      }

      // Step 2: Buyers accept some orders
      for (let i = 0; i < Math.min(buyers.length, createdOrderIds.length); i++) {
        const buyer = buyers[i];
        const orderId = createdOrderIds[i];
        const fate = Math.random(); // decide order lifecycle

        // Accept order
        const { error: acceptErr } = await adminClient.from('p2p_orders')
          .update({ executor_id: buyer.user_id, status: 'matched', matched_at: new Date().toISOString() })
          .eq('id', orderId).eq('status', 'open');

        if (acceptErr) continue;
        metrics.p2p_orders_accepted++;

        if (fate < 0.25) {
          // Cancel (25%)
          await adminClient.from('p2p_orders')
            .update({ status: 'cancelled', completed_at: new Date().toISOString() })
            .eq('id', orderId);
          metrics.p2p_orders_cancelled++;
        } else if (fate < 0.35) {
          // Dispute (10%)
          await adminClient.from('p2p_orders')
            .update({ status: 'disputed' })
            .eq('id', orderId);
          metrics.p2p_disputes++;
        } else {
          // Complete (65%)
          await adminClient.from('p2p_orders')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', orderId);
          metrics.p2p_orders_completed++;

          // Step 3: Leave rating
          const isPositive = Math.random() > 0.2; // 80% positive
          const { data: orderData } = await adminClient.from('p2p_orders')
            .select('creator_id').eq('id', orderId).single();

          if (orderData) {
            const { error: ratingErr } = await adminClient.from('p2p_ratings').insert({
              order_id: orderId,
              rater_id: buyer.user_id,
              rated_id: orderData.creator_id,
              rating: isPositive ? 1 : -1,
              comment: `[GHOST_TEST] ${isPositive ? 'Great trader!' : 'Slow response.'}`,
            });
            if (!ratingErr) {
              metrics.ratings_submitted++;
              if (isPositive) metrics.ratings_positive++;
              else metrics.ratings_negative++;
            }
          }
        }
      }

      results.push(exec({
        test: `P2P lifecycle (${metrics.p2p_orders_created} orders)`, category: 'Behavioral_P2P',
        status: metrics.p2p_orders_created === 0 ? 'warning' : 'pass',
        detail: `Created: ${metrics.p2p_orders_created}, Accepted: ${metrics.p2p_orders_accepted}, Completed: ${metrics.p2p_orders_completed}, Cancelled: ${metrics.p2p_orders_cancelled}, Disputed: ${metrics.p2p_disputes}.`,
        severity: metrics.p2p_orders_created === 0 ? 'medium' : 'low',
      }, {
        what: `Full P2P lifecycle simulated: ${metrics.p2p_orders_created} orders → ${metrics.p2p_orders_completed} completed, ${metrics.p2p_orders_cancelled} cancelled, ${metrics.p2p_disputes} disputed.`,
        why: 'P2P lifecycle coverage validates marketplace integrity end-to-end.',
        action: metrics.p2p_orders_created === 0 ? 'Check agent wallet balances and p2p_orders schema.' : 'No action needed.',
      }));

      results.push(exec({
        test: `P2P ratings (${metrics.ratings_submitted} submitted)`, category: 'Behavioral_P2P',
        status: metrics.ratings_submitted > 0 ? 'pass' : 'warning',
        detail: `${metrics.ratings_positive} positive, ${metrics.ratings_negative} negative out of ${metrics.ratings_submitted}.`,
        severity: 'low',
      }, {
        what: `${metrics.ratings_submitted} ratings submitted (${metrics.ratings_positive} 👍, ${metrics.ratings_negative} 👎).`,
        why: 'Rating distribution validates reputation system.',
        action: metrics.ratings_submitted === 0 ? 'No completed orders to rate.' : 'No action needed.',
      }));
    }

    // ════════════════════════════════════════
    // SUITE: REFERRAL INTEGRITY
    // ════════════════════════════════════════
    if (runSuite('referral') || runSuite('full')) {
      const { data: tl } = await adminClient
        .from('team_members').select('leader_id, member_id, level')
        .in('member_id', ghosts.map(g => g.user_id));

      const ghostsWithReferral = ghosts.filter(g => g.referred_by);
      results.push(exec({
        test: 'Referral coverage', category: 'Referral_Integrity',
        status: ghostsWithReferral.length > ghosts.length * 0.5 ? 'pass' : 'warning',
        detail: `${ghostsWithReferral.length}/${ghosts.length} have referral links.`,
        severity: 'medium',
      }, {
        what: `${ghostsWithReferral.length} of ${ghosts.length} accounts linked in referral tree.`,
        why: 'Low coverage masks hierarchy bugs.',
        action: ghostsWithReferral.length > ghosts.length * 0.5 ? 'No action needed.' : 'Re-run provisioning.',
      }));

      if (tl) {
        const circularPairs = new Set<string>();
        for (const link of tl) {
          const reverse = tl.find(
            t => t.leader_id === link.member_id && t.member_id === link.leader_id && t.level === 1
          );
          if (reverse) circularPairs.add(`${link.leader_id}<->${link.member_id}`);
        }
        results.push(exec({
          test: 'Circular referral detection', category: 'Referral_Integrity',
          status: circularPairs.size === 0 ? 'pass' : 'fail',
          detail: circularPairs.size === 0 ? 'No circular referrals.' : `${circularPairs.size} circular pairs.`,
          severity: circularPairs.size === 0 ? 'low' : 'critical',
        }, {
          what: circularPairs.size === 0 ? 'No circular dependencies.' : `${circularPairs.size} circular loop(s).`,
          why: circularPairs.size === 0 ? 'Tree integrity maintained.' : 'Circular referrals enable infinite commission cascading.',
          action: circularPairs.size === 0 ? 'No action needed.' : 'Add trigger to prevent A→B→A chains.',
        }));
      }

      // Referral attempt simulation
      const refAgents = pick(activeAgents, safeMode ? 3 : 8);
      for (const agent of refAgents) {
        metrics.referrals_attempted++;
        // Just verify referral_code exists and is queryable
        if (agent.referral_code) metrics.referrals_succeeded++;
      }

      results.push(exec({
        test: `Referral readiness (${metrics.referrals_succeeded}/${metrics.referrals_attempted})`, category: 'Referral_Integrity',
        status: metrics.referrals_succeeded === metrics.referrals_attempted ? 'pass' : 'warning',
        detail: `${metrics.referrals_succeeded} agents have valid referral codes.`,
        severity: 'low',
      }, {
        what: `${metrics.referrals_succeeded} of ${metrics.referrals_attempted} agents have working referral codes.`,
        why: 'Missing referral codes prevent organic tree growth.',
        action: metrics.referrals_succeeded < metrics.referrals_attempted ? 'Check referral code generation trigger.' : 'No action needed.',
      }));
    }

    // ════════════════════════════════════════
    // SUITE: FRAUD SIMULATION
    // ════════════════════════════════════════
    if (runSuite('fraud') || runSuite('full')) {
      const fraudAgents = pick(ghosts, safeMode ? 5 : 10);

      // Negative balance injection
      if (fraudAgents.length >= 1) {
        const brokeAgent = fraudAgents[0];
        const { data: brokeWallet } = await adminClient
          .from('wallets').select('nova_balance').eq('user_id', brokeAgent.user_id).single();
        if (brokeWallet) {
          const { error: fraudErr } = await adminClient
            .from('wallets').update({ nova_balance: -50000 }).eq('user_id', brokeAgent.user_id);
          if (!fraudErr) {
            await adminClient.from('wallets').update({ nova_balance: brokeWallet.nova_balance }).eq('user_id', brokeAgent.user_id);
          }
          results.push(exec({
            test: 'Negative balance injection', category: 'Fraud_Simulation',
            status: fraudErr ? 'pass' : 'fail',
            detail: fraudErr ? 'Manipulation rejected.' : 'Negative balance accepted.',
            severity: fraudErr ? 'low' : 'critical',
          }, {
            what: fraudErr ? 'Balance -50,000 rejected by constraint.' : 'Wallet accepted -50,000.',
            why: fraudErr ? 'DB-level protection active.' : 'Unlimited fund extraction possible.',
            action: fraudErr ? 'No action needed.' : 'CRITICAL: Add CHECK (nova_balance >= 0).',
          }));
        }
      }

      // Self-referral
      if (fraudAgents.length >= 3) {
        const selfRefAgent = fraudAgents[2];
        await adminClient.from('profiles')
          .update({ referred_by: selfRefAgent.referral_code })
          .eq('user_id', selfRefAgent.user_id);
        const { data: selfRefCheck } = await adminClient.from('profiles')
          .select('referred_by, referral_code').eq('user_id', selfRefAgent.user_id).single();
        const selfRefPassed = selfRefCheck?.referred_by === selfRefCheck?.referral_code;
        results.push(exec({
          test: 'Self-referral prevention', category: 'Fraud_Simulation',
          status: selfRefPassed ? 'fail' : 'pass',
          detail: selfRefPassed ? 'Self-referral accepted.' : 'Self-referral blocked.',
          severity: selfRefPassed ? 'high' : 'low',
        }, {
          what: selfRefPassed ? 'User referred themselves.' : 'Self-referral blocked.',
          why: selfRefPassed ? 'Enables infinite commission farming.' : 'Referral integrity maintained.',
          action: selfRefPassed ? 'Add CHECK: referred_by != referral_code.' : 'No action needed.',
        }));
        if (selfRefPassed) {
          await adminClient.from('profiles').update({ referred_by: null }).eq('user_id', selfRefAgent.user_id);
        }
      }
    }

    // ════════════════════════════════════════
    // SUITE: CONTEST
    // ════════════════════════════════════════
    if (runSuite('contest') || runSuite('full')) {
      const { data: activeContests } = await adminClient
        .from('contests').select('id, title').eq('status', 'active').limit(1);
      if (activeContests && activeContests.length > 0) {
        const contestId = activeContests[0].id;
        const voter = ghosts[0];
        const candidate = ghosts[1];

        await adminClient.from('contest_participants').upsert({
          contest_id: contestId, user_id: candidate.user_id, status: 'active',
        });

        const { error: vote1Err } = await adminClient.from('contest_votes').insert({
          contest_id: contestId, voter_id: voter.user_id, contestant_id: candidate.user_id, vote_type: 'free',
        });
        const { error: vote2Err } = await adminClient.from('contest_votes').insert({
          contest_id: contestId, voter_id: voter.user_id, contestant_id: candidate.user_id, vote_type: 'free',
        });

        results.push(exec({
          test: 'Double vote prevention', category: 'Contest_Integrity',
          status: vote2Err ? 'pass' : (vote1Err ? 'warning' : 'fail'),
          detail: vote2Err ? 'Double vote rejected.' : 'Double vote accepted.',
          severity: vote2Err ? 'low' : 'critical',
        }, {
          what: vote2Err ? 'Second vote rejected by constraint.' : 'Duplicate votes accepted.',
          why: vote2Err ? 'Vote integrity maintained.' : 'Vote manipulation distorts contest outcomes.',
          action: vote2Err ? 'No action needed.' : 'Add UNIQUE constraint on contest_votes.',
        }));

        // Cleanup
        await adminClient.from('contest_votes').delete().eq('voter_id', voter.user_id).eq('contest_id', contestId);
        await adminClient.from('contest_participants').delete().eq('user_id', candidate.user_id).eq('contest_id', contestId);
      } else {
        results.push(exec({
          test: 'Contest availability', category: 'Contest_Integrity',
          status: 'warning', detail: 'No active contests.', severity: 'low',
        }, {
          what: 'No active contest for testing.',
          why: 'Double-vote testing requires an active contest.',
          action: 'Run test during active contest cycle.',
        }));
      }
    }

    // ════════════════════════════════════════
    // EXECUTIVE REPORT
    // ════════════════════════════════════════
    const totalDuration = Date.now() - startTime;
    const failures = results.filter(r => r.status === 'fail');
    const warnings = results.filter(r => r.status === 'warning');
    const criticals = failures.filter(r => r.severity === 'critical');

    // Log incidents
    const incidentRows = results
      .filter(r => r.status === 'fail' || r.status === 'warning')
      .map(r => ({
        actor_username: r.test.match(/:\s*(ghost_agent_\w+)/)?.[1] || 'ghost_system',
        is_ghost: true,
        screen: 'commander/ghost-army',
        feature: r.category,
        action_type: r.test,
        error_message: r.what_happened,
        error_code: r.status,
        severity: r.severity,
        category: r.category,
        endpoint: scenario,
        flow: r.category.replace(/_/g, ' '),
        root_cause: r.recommended_action,
        latency_ms: r.latency_ms || null,
        metadata: { why: r.why_it_matters, scenario, safe_mode: safeMode },
      }));

    if (incidentRows.length > 0) {
      await adminClient.from('system_incidents').insert(incidentRows);
    }

    const summary = {
      scenario,
      safe_mode: safeMode,
      agents_tested: activeAgents.length,
      total_tests: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: failures.length,
      warnings: warnings.length,
      critical_issues: criticals.length,
      duration_ms: totalDuration,
      behavioral: metrics,
    };

    const executiveSummary = [
      `[${scenario.toUpperCase()}] Behavioral simulation: ${activeAgents.length} agents, ${results.length} tests, ${totalDuration}ms.`,
      `RESULTS: ${summary.passed} passed, ${failures.length} failed, ${warnings.length} warnings.`,
      '',
      '── BEHAVIORAL METRICS ──',
      `Social: ${metrics.follows_created} follows, ${metrics.profiles_viewed} profiles viewed`,
      `Chat: ${metrics.messages_sent} messages in ${metrics.chats_started} conversations`,
      `P2P: ${metrics.p2p_orders_created} orders → ${metrics.p2p_orders_completed} completed, ${metrics.p2p_orders_cancelled} cancelled, ${metrics.p2p_disputes} disputed`,
      `Ratings: ${metrics.ratings_submitted} (${metrics.ratings_positive}👍 ${metrics.ratings_negative}👎)`,
      `Referrals: ${metrics.referrals_succeeded}/${metrics.referrals_attempted} ready`,
    ];

    if (criticals.length > 0) {
      executiveSummary.push('', '── CRITICAL ISSUES ──');
      for (const c of criticals) {
        executiveSummary.push(`▸ ${c.test}`, `  Problem: ${c.what_happened}`, `  Impact: ${c.why_it_matters}`, `  Action: ${c.recommended_action}`);
      }
    }

    const proposalPriority = criticals.length > 0 ? 'critical' : failures.length > 0 ? 'high' : warnings.length > 0 ? 'medium' : 'low';

    await adminClient.from('ai_proposals').insert({
      title: `[${scenario.toUpperCase()}] Behavioral sim — ${activeAgents.length} agents, ${metrics.p2p_orders_completed} trades, ${criticals.length} critical`,
      title_ar: `[${scenario}] محاكاة سلوكية — ${activeAgents.length} عميل، ${metrics.p2p_orders_completed} صفقة`,
      description: executiveSummary.join('\n'),
      description_ar: `محاكاة ${scenario}: ${summary.passed} نجح، ${failures.length} فشل. ${metrics.p2p_orders_completed} صفقة مكتملة.`,
      proposal_type: 'system_diagnostic',
      priority: proposalPriority,
      affected_area: 'infrastructure',
      status: 'pending',
      risk_level: proposalPriority === 'critical' ? 'critical' : proposalPriority === 'high' ? 'high' : 'medium',
      impact_scope: 'platform_wide',
    });

    // Cleanup ghost test data only in SAFE mode
    if (!persistData) {
      await adminClient.from('direct_messages').delete().like('content', '%[GHOST_TEST]%');
      await adminClient.from('p2p_ratings').delete().like('comment', '%[GHOST_TEST]%');
      const ghostUserIds = ghosts.map(g => g.user_id);
      await adminClient.from('p2p_orders').delete()
        .in('creator_id', ghostUserIds)
        .in('status', ['open', 'cancelled', 'completed', 'disputed', 'matched']);
      await adminClient.from('conversations').delete()
        .in('participant1_id', ghostUserIds)
        .in('participant2_id', ghostUserIds);
      await adminClient.from('follows').delete()
        .in('follower_id', ghostUserIds)
        .in('following_id', ghostUserIds);
    }

    return new Response(JSON.stringify({ success: true, summary, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
