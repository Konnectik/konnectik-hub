import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { NotificationCategory } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

export type FilterMode = 'all' | 'zone' | 'balance';

export interface NotificationFilter {
  mode: FilterMode;
  zoneIds?: string[];
  minBalance?: number;
  maxBalance?: number;
}

async function fetchRecipientIds(filter: NotificationFilter): Promise<string[]> {
  if (filter.mode === 'all') {
    const { data, error } = await supabase.from('profiles').select('id');
    if (error) throw error;
    return (data ?? []).map((p) => p.id);
  }

  if (filter.mode === 'zone' && filter.zoneIds?.length) {
    // Get distinct user_ids who have sessions in selected zones
    const { data: aps, error: apErr } = await supabase
      .from('access_points')
      .select('id')
      .in('id', filter.zoneIds);
    if (apErr) throw apErr;
    if (!aps?.length) return [];

    const apIds = aps.map((a) => a.id);
    const { data: segments, error: segErr } = await supabase
      .from('session_segments')
      .select('user_id')
      .in('ap_id', apIds);
    if (segErr) throw segErr;

    const unique = [...new Set((segments ?? []).map((s) => s.user_id))];
    return unique;
  }

  if (filter.mode === 'balance') {
    let query = supabase.from('profiles').select('id');
    if (filter.minBalance != null) query = query.gte('wallet_balance_xaf', filter.minBalance);
    if (filter.maxBalance != null) query = query.lte('wallet_balance_xaf', filter.maxBalance);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((p) => p.id);
  }

  return [];
}

export const useNotificationRecipients = (filter: NotificationFilter, enabled: boolean) => {
  return useQuery({
    queryKey: ['notification-recipients', filter],
    queryFn: () => fetchRecipientIds(filter),
    enabled,
  });
};

export const useSendBulkNotifications = () => {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      userIds,
      title,
      body,
      category,
    }: {
      userIds: string[];
      title: string;
      body: string;
      category: NotificationCategory;
    }) => {
      setSending(true);
      const BATCH_SIZE = 500;
      let inserted = 0;

      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batch = userIds.slice(i, i + BATCH_SIZE).map((uid) => ({
          user_id: uid,
          title,
          body,
          category,
        }));
        const { error } = await supabase.from('notifications').insert(batch);
        if (error) throw error;
        inserted += batch.length;
      }

      return inserted;
    },
    onSuccess: (count) => {
      toast({ title: 'Notifications sent', description: `${count} notification(s) delivered.` });
      setSending(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setSending(false);
    },
  });

  return { ...mutation, sending };
};
