import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, UserBundle, SessionSegment, WalletTransaction, GiftCredit, AppRole } from '@/types/database';

export interface UserDetail {
  profile: Profile & { role: AppRole | null };
  bundles: UserBundle[];
  segments: SessionSegment[];
  walletTransactions: WalletTransaction[];
  giftCredits: GiftCredit[];
}

export const useUserDetail = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-detail', userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserDetail> => {
      const [profileRes, roleRes, bundlesRes, segmentsRes, walletRes, giftsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId!).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId!).maybeSingle(),
        supabase.from('user_bundles').select('*, bundles(*)').eq('user_id', userId!).order('purchased_at', { ascending: false }),
        supabase.from('session_segments').select('*, access_points(zone_label)').eq('user_id', userId!).order('started_at', { ascending: false }),
        supabase.from('wallet_transactions').select('*').eq('user_id', userId!).order('created_at', { ascending: false }),
        supabase.from('gift_credits').select('*').eq('user_id', userId!).order('granted_at', { ascending: false }),
      ]);

      if (profileRes.error) throw profileRes.error;

      return {
        profile: { ...profileRes.data, role: roleRes.data?.role as AppRole ?? null },
        bundles: bundlesRes.data ?? [],
        segments: segmentsRes.data ?? [],
        walletTransactions: walletRes.data ?? [],
        giftCredits: giftsRes.data ?? [],
      };
    },
  });
};
