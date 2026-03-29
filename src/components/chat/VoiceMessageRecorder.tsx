import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mic, Send, Square, Play, Pause, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface VoiceMessageRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  disabled?: boolean;
}

export function VoiceMessageRecorder({ onSend, disabled = false }: VoiceMessageRecorderProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isRTL = language === 'ar';
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      
      // Start duration timer
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL 
          ? 'لا يمكن الوصول إلى الميكروفون' 
          : 'Cannot access microphone',
        variant: 'destructive',
      });
    }
  }, [isRTL, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clear duration timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isRecording]);

  const sendVoiceMessage = useCallback(() => {
    if (audioBlob) {
      onSend(audioBlob, duration);
      resetRecording();
    }
  }, [audioBlob, duration, onSend]);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Update current time during playback
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle playback end
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        {!audioBlob ? (
          // Recording interface
          <>
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={disabled}
              className="relative"
            >
              {isRecording ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              {isRecording && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-500 opacity-20"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}
            </Button>
            
            {isRecording && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-red-500 rounded-full"
                      animate={{ height: [4, 16, 4] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.8,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
                <span className="text-sm font-mono text-red-500">
                  {formatDuration(duration)}
                </span>
              </div>
            )}
          </>
        ) : (
          // Playback interface
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlayback}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">
                  {formatDuration(currentTime)}
                </span>
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-mono">
                  {formatDuration(duration)}
                </span>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={resetRecording}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            
            <Button
              variant="default"
              size="icon"
              onClick={sendVoiceMessage}
            >
              <Send className="h-4 w-4" />
            </Button>
          </>
        )}
        
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            className="hidden"
          />
        )}
      </div>
    </Card>
  );
}
