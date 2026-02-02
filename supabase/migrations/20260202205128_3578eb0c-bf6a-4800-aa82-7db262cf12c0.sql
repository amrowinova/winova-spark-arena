-- Create follows table for user follow relationships
CREATE TABLE public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate follows
  CONSTRAINT follows_unique UNIQUE (follower_id, following_id),
  
  -- Prevent self-follow
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);

-- Enable Row Level Security
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Everyone can view follows (for counting)
CREATE POLICY "Follows are viewable by everyone"
ON public.follows
FOR SELECT
USING (true);

-- Users can follow others
CREATE POLICY "Users can follow others"
ON public.follows
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
ON public.follows
FOR DELETE
USING (auth.uid() = follower_id);

-- Enable realtime for follows table
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;