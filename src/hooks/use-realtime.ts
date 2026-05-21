import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type TableName = 'wifi_zones' | 'routers' | 'bundles' | 'transactions' | 'profiles' | 'user_roles'
  | 'providers' | 'access_points' | 'user_bundles' | 'session_segments' | 'wallet_transactions'
  | 'provider_earnings_ledger' | 'provider_wallets' | 'gift_credits' | 'referral_events'
  | 'notifications' | 'device_tokens' | 'ap_health_log' | 'admin_audit_log';

export const useRealtimeSubscription = (table: TableName, queryKey: string[]) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryClient, queryKey]);
};
