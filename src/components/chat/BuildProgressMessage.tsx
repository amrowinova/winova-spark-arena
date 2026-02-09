import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Building2,
  Layers,
  Database,
  Server,
  Layout,
  Cloud,
  FileText,
  Package,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

const PHASE_CONFIG = {
  clarification: { icon: HelpCircle, label: 'التوضيح', color: 'text-info' },
  architecture: { icon: Building2, label: 'الهندسة المعمارية', color: 'text-primary' },
  stack: { icon: Layers, label: 'التقنيات', color: 'text-accent-foreground' },
  database: { icon: Database, label: 'قاعدة البيانات', color: 'text-warning' },
  backend: { icon: Server, label: 'الخدمات الخلفية', color: 'text-success' },
  frontend: { icon: Layout, label: 'الواجهات', color: 'text-primary' },
  infra: { icon: Cloud, label: 'البنية التحتية', color: 'text-info' },
  documentation: { icon: FileText, label: 'التوثيق', color: 'text-muted-foreground' },
  delivery: { icon: Package, label: 'التسليم', color: 'text-success' },
} as const;

type Phase = keyof typeof PHASE_CONFIG;

interface BuildProgressMessageProps {
  projectId: string;
  conversationId: string;
  messageType: 'build_clarification' | 'build_delivery' | 'build_progress' | 'build_error';
  content: string;
}

export function BuildProgressMessage({ projectId, conversationId, messageType, content }: BuildProgressMessageProps) {
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(messageType === 'build_clarification');
  const [answers, setAnswers] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [buildPhases, setBuildPhases] = useState<Record<string, string>>({});

  // Parse questions from content for clarification messages
  const questions = messageType === 'build_clarification'
    ? content.split('\n').filter(l => /^\d+\./.test(l.trim())).map(l => l.replace(/^\d+\.\s*/, '').trim())
    : [];

  // Initialize answers array
  useEffect(() => {
    if (questions.length > 0 && answers.length === 0) {
      setAnswers(new Array(questions.length).fill(''));
    }
  }, [questions.length]);

  // Subscribe to project updates for live progress
  useEffect(() => {
    if (!projectId || messageType !== 'build_progress') return;

    const channel = supabase
      .channel(`build-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_build_projects',
          filter: `id=eq.${projectId}`,
        },
        (payload: any) => {
          if (payload.new?.phase_progress) {
            setBuildPhases(payload.new.phase_progress);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, messageType]);

  // Handle sending clarification answers
  const handleSendAnswers = async () => {
    if (sending || sent) return;
    setSending(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-build-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          action: 'continue',
          project_id: projectId,
          answers: answers.filter(a => a.trim()),
          conversation_id: conversationId,
        }),
      });

      if (res.ok) {
        setSent(true);
      }
    } catch (err) {
      console.error('[BuildProgress] Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSkip = async () => {
    if (sending || sent) return;
    setSending(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      await fetch(`${supabaseUrl}/functions/v1/ai-build-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          action: 'continue',
          project_id: projectId,
          answers: [],
          conversation_id: conversationId,
        }),
      });

      setSent(true);
    } catch (err) {
      console.error('[BuildProgress] Skip error:', err);
    } finally {
      setSending(false);
    }
  };

  // ─── Clarification UI ───────────────────────────
  if (messageType === 'build_clarification' && !sent) {
    return (
      <div className="mt-3 pt-2 border-t border-border/30 space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-info" />
          <span className="text-xs font-medium">أسئلة توضيحية</span>
        </div>

        {questions.map((q, i) => (
          <div key={i} className="space-y-1">
            <p className="text-xs text-muted-foreground">{i + 1}. {q}</p>
            <Input
              value={answers[i] || ''}
              onChange={(e) => {
                const newAnswers = [...answers];
                newAnswers[i] = e.target.value;
                setAnswers(newAnswers);
              }}
              placeholder="إجابتك..."
              className="h-8 text-xs"
              disabled={sending}
            />
          </div>
        ))}

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSendAnswers}
            disabled={sending || answers.every(a => !a.trim())}
            className="h-7 text-xs gap-1"
          >
            {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            إرسال والمتابعة
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSkip}
            disabled={sending}
            className="h-7 text-xs"
          >
            تخطي
          </Button>
        </div>
      </div>
    );
  }

  // ─── Sent confirmation ──────────────────────────
  if (messageType === 'build_clarification' && sent) {
    return (
      <div className="mt-3 pt-2 border-t border-border/30">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs font-medium">تم إرسال الإجابات — جاري البناء...</span>
          <Loader2 className="h-3 w-3 animate-spin" />
        </div>
      </div>
    );
  }

  // ─── Build Progress Tracker ─────────────────────
  if (messageType === 'build_progress') {
    const allPhases = Object.keys(PHASE_CONFIG) as Phase[];

    return (
      <div className="mt-3 pt-2 border-t border-border/30">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 w-full text-start"
        >
          <Building2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium flex-1">تقدم البناء</span>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-1.5">
                {allPhases.map((phase) => {
                  const config = PHASE_CONFIG[phase];
                  const Icon = config.icon;
                  const status = buildPhases[phase];
                  const isCompleted = status === 'completed';
                  const isActive = status === 'in_progress';

                  return (
                    <div
                      key={phase}
                      className={`flex items-center gap-2 py-1 px-2 rounded text-xs ${
                        isCompleted ? 'bg-success/10' : isActive ? 'bg-primary/10' : 'opacity-40'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : isActive ? (
                        <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                      ) : (
                        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                      )}
                      <span className={isCompleted ? 'text-success' : isActive ? 'text-primary font-medium' : ''}>
                        {config.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── Delivery Report ────────────────────────────
  if (messageType === 'build_delivery') {
    return (
      <div className="mt-3 pt-2 border-t border-primary/30">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-success" />
          <span className="text-xs font-medium text-success">حزمة البناء جاهزة</span>
          <Badge variant="outline" className="text-[10px] h-5">
            جاهز للمراجعة
          </Badge>
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────
  if (messageType === 'build_error') {
    return (
      <div className="mt-3 pt-2 border-t border-destructive/30">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-xs font-medium text-destructive">فشل في البناء</span>
        </div>
      </div>
    );
  }

  return null;
}
