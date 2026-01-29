import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface RankInfoSheetProps {
  language: string;
  children: React.ReactNode;
  rankTitle: string;
}

export function RankInfoSheet({ language, children, rankTitle }: RankInfoSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/5"
        >
          <HelpCircle className="h-4 w-4" />
          {language === 'ar' ? 'من أنت؟' : 'Who Are You?'}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">
            {rankTitle}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 pb-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
