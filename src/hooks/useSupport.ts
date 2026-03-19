import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SupportTicket {
  id: string;
  user_id: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  rating: number | null;
  // Joined data
  user_name?: string;
  user_avatar?: string;
  assigned_name?: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  // Joined data
  sender_name?: string;
  sender_avatar?: string;
}

export function useSupport() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);

  // Check if current user is support staff
  const checkStaffStatus = useCallback(async () => {
    if (!user) {
      setIsStaff(false);
      return false;
    }

    const { data, error } = await supabase
      .rpc('is_support_staff', { _user_id: user.id });

    if (error) {
      console.error('Error checking staff status:', error);
      setIsStaff(false);
      return false;
    }

    setIsStaff(data);
    return data;
  }, [user]);

  // Fetch all tickets (for support staff) or user's tickets
  const fetchTickets = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);

    const { data: ticketsData, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      setIsLoading(false);
      return;
    }

    // Join with profiles for user names
    const ticketsWithProfiles = await Promise.all(
      (ticketsData || []).map(async (ticket) => {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('user_id', ticket.user_id)
          .single();

        let assignedProfile = null;
        if (ticket.assigned_to) {
          const { data } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('user_id', ticket.assigned_to)
            .single();
          assignedProfile = data;
        }

        return {
          ...ticket,
          user_name: userProfile?.name || 'Unknown',
          user_avatar: userProfile?.avatar_url,
          assigned_name: assignedProfile?.name,
        } as SupportTicket;
      })
    );

    setTickets(ticketsWithProfiles);
    setIsLoading(false);
  }, [user]);

  // Fetch messages for a ticket
  const fetchMessages = async (ticketId: string): Promise<SupportMessage[]> => {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    // Join with profiles
    const messagesWithProfiles = await Promise.all(
      (data || []).map(async (message) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('user_id', message.sender_id)
          .single();

        return {
          ...message,
          sender_name: profile?.name || 'Unknown',
          sender_avatar: profile?.avatar_url,
        } as SupportMessage;
      })
    );

    return messagesWithProfiles;
  };

  // Create a new ticket
  const createTicket = async (
    title: string,
    description: string,
    category: string,
    referenceType?: string,
    referenceId?: string
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        title,
        description,
        category,
        reference_type: referenceType || null,
        reference_id: referenceId || null,
      })
      .select()
      .single();

    if (!error) {
      fetchTickets();
    }

    return { data, error };
  };

  // Update ticket status
  const updateTicketStatus = async (
    ticketId: string,
    status: SupportTicket['status'],
    resolvedAt?: string
  ) => {
    const updates: Record<string, unknown> = { status };
    if (resolvedAt) updates.resolved_at = resolvedAt;

    const { error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId);

    if (!error) {
      fetchTickets();
    }

    return { error };
  };

  // Assign ticket to support staff
  const assignTicket = async (ticketId: string, staffId: string) => {
    const { error } = await supabase
      .from('support_tickets')
      .update({ 
        assigned_to: staffId,
        status: 'in_progress'
      })
      .eq('id', ticketId);

    if (!error) {
      fetchTickets();
    }

    return { error };
  };

  // Send a message
  const sendMessage = async (
    ticketId: string,
    content: string,
    isInternal = false
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        content,
        is_internal: isInternal,
      })
      .select()
      .single();

    return { data, error };
  };

  // Rate a resolved ticket
  const rateTicket = async (ticketId: string, rating: number) => {
    const { error } = await supabase
      .from('support_tickets')
      .update({ rating })
      .eq('id', ticketId);

    if (!error) {
      fetchTickets();
    }

    return { error };
  };

  // Get ticket statistics
  const getStats = useCallback(() => {
    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in_progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      urgent: tickets.filter(t => t.priority === 'urgent').length,
    };
  }, [tickets]);

  // Initialize
  useEffect(() => {
    if (user) {
      checkStaffStatus();
      fetchTickets();
    }
  }, [user, checkStaffStatus, fetchTickets]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`support_changes_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => fetchTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTickets]);

  return {
    tickets,
    isLoading,
    isStaff,
    fetchTickets,
    fetchMessages,
    createTicket,
    updateTicketStatus,
    assignTicket,
    sendMessage,
    rateTicket,
    getStats,
    checkStaffStatus,
  };
}
