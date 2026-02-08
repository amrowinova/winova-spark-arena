/**
 * AI Observability Logger — Phase 1
 *
 * Fire-and-forget helpers that write to:
 *   ai_activity_stream
 *   ai_money_flow
 *   ai_failures
 *
 * Rules:
 *   • Never block the user flow
 *   • If logging fails → ignore silently
 *   • All inserts are async with no await at call-site
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/* ── Types ─────────────────────────────────────── */

export interface ActivityEntry {
  user_id?: string;
  role?: string;
  action_type: string;
  entity_type?: string;
  entity_id?: string;
  before_state?: Json;
  after_state?: Json;
  duration_ms?: number;
  success?: boolean;
  error_code?: string;
}

export interface MoneyFlowEntry {
  operation: string;
  from_user?: string;
  to_user?: string;
  amount: number;
  currency?: string;
  reference_type?: string;
  reference_id?: string;
}

export interface FailureEntry {
  rpc_name: string;
  user_id?: string;
  error_message?: string;
  parameters?: Json;
}

/* ── Internal safe insert ──────────────────────── */

function safeInsert(table: string, row: Record<string, unknown>): void {
  (supabase.from(table as any).insert([row]) as any)
    .then?.((res: { error?: { message: string } }) => {
      if (res?.error) console.warn(`[ai-logger] ${table} insert failed:`, res.error.message);
    });
}

/* ── Helpers ───────────────────────────────────── */

/**
 * Log a system activity event.
 * Fire-and-forget — never throws.
 */
export function logActivity(entry: ActivityEntry): void {
  try {
    safeInsert('ai_activity_stream', {
      user_id: entry.user_id ?? null,
      role: entry.role ?? null,
      action_type: entry.action_type,
      entity_type: entry.entity_type ?? null,
      entity_id: entry.entity_id ?? null,
      before_state: entry.before_state ?? null,
      after_state: entry.after_state ?? null,
      duration_ms: entry.duration_ms ?? null,
      success: entry.success ?? null,
      error_code: entry.error_code ?? null,
    });
  } catch { /* silent */ }
}

/**
 * Log a money movement event.
 * Fire-and-forget — never throws.
 */
export function logMoneyFlow(entry: MoneyFlowEntry): void {
  try {
    safeInsert('ai_money_flow', {
      operation: entry.operation,
      from_user: entry.from_user ?? null,
      to_user: entry.to_user ?? null,
      amount: entry.amount,
      currency: entry.currency ?? 'nova',
      reference_type: entry.reference_type ?? null,
      reference_id: entry.reference_id ?? null,
    });
  } catch { /* silent */ }
}

/**
 * Log an RPC failure event.
 * Fire-and-forget — never throws.
 */
export function logFailure(entry: FailureEntry): void {
  try {
    safeInsert('ai_failures', {
      rpc_name: entry.rpc_name,
      user_id: entry.user_id ?? null,
      error_message: entry.error_message ?? null,
      parameters: entry.parameters ?? null,
    });
  } catch { /* silent */ }
}
