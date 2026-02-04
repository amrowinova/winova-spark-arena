import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAIHumanQuestion() {
  const [isAsking, setIsAsking] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const askQuestion = useMutation({
    mutationFn: async (question: string) => {
      setIsAsking(true);
      
      const { data, error } = await supabase.functions.invoke('ai-human-question', {
        body: { question }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'تم إرسال السؤال',
        description: 'الوكلاء يعملون على الرد...',
      });
      // Refetch messages
      queryClient.invalidateQueries({ queryKey: ['ai-control-room-messages'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في إرسال السؤال',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsAsking(false);
    }
  });

  return {
    askQuestion: askQuestion.mutate,
    isAsking: askQuestion.isPending || isAsking,
  };
}
