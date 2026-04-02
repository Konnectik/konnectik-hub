import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AdminAuditLog } from '@/types/database';

export interface AuditLogWithAdmin extends AdminAuditLog {
  admin_name?: string;
}

export function useAuditLogs(limit = 100) {
  return useQuery({
    queryKey: ['admin-audit-log', limit],
    queryFn: async (): Promise<AuditLogWithAdmin[]> => {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (!data?.length) return [];

      // Fetch admin names
      const adminIds = [...new Set(data.map((l) => l.admin_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', adminIds);

      const nameMap = new Map(profiles?.map((p) => [p.id, p.full_name]) ?? []);

      return data.map((log) => ({
        ...log,
        admin_name: nameMap.get(log.admin_id) ?? 'Unknown',
      })) as AuditLogWithAdmin[];
    },
    refetchInterval: 30_000,
  });
}
