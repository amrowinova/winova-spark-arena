import { useState } from 'react';
import {
  Package, CheckCircle2, Download, FileText, Database, Server,
  Layout, Cloud, Shield, Activity, ChevronDown, ChevronUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProjectDeliveryCardProps {
  projectId: string;
  content: string;
}

export function ProjectDeliveryCard({ projectId, content }: ProjectDeliveryCardProps) {
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  // Parse summary sections from content
  const sections = content.split('━━━━━━━━━━━━━━━━━━━━━━').filter(Boolean);
  const mainContent = sections[0]?.trim() || '';

  return (
    <div className="mt-3 pt-2 border-t border-success/30 space-y-2">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-success" />
        <span className="text-xs font-semibold text-success">📦 حزمة البناء جاهزة</span>
        <Badge variant="outline" className="text-[10px] h-5 ms-auto bg-success/10 text-success border-success/30">
          <CheckCircle2 className="h-3 w-3 me-1" />
          جاهز
        </Badge>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
      </button>

      {expanded && (
        <div className="space-y-2">
          {/* Download Buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { icon: '📄', label: 'التوثيق الكامل' },
              { icon: '🗄️', label: 'SQL Schema' },
              { icon: '📬', label: 'API Docs' },
              { icon: '📑', label: 'تعليمات التشغيل' },
              { icon: '📊', label: 'تقرير الوكلاء' },
              { icon: '☁️', label: 'البنية التحتية' },
            ].map(({ icon, label }) => (
              <button
                key={label}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-muted/30 hover:bg-accent/30 transition-colors text-[10px]"
              >
                <span>{icon}</span>
                <span className="flex-1 text-start truncate">{label}</span>
                <Download className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </div>

          {/* Admin Actions */}
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="h-7 text-xs flex-1 gap-1">
              <CheckCircle2 className="h-3 w-3" />
              موافقة وتنفيذ
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
              ↻ إعادة البناء
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
