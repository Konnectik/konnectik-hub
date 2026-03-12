import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from './use-realtime';
import type { Profile, AppRole } from '@/types/database';

interface UserWithRole extends Profile {
  role: AppRole | null;
}

export const useUsers = (roleFilter?: AppRole) => {
  useRealtimeSubscription('profiles', ['users', roleFilter ?? '__all__']);
  return useQuery({
    queryKey: ['users', roleFilter],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map((p) => {
        const userRole = roles?.find((r) => r.user_id === p.id);
        return { ...p, role: userRole ? (userRole.role as AppRole) : null };
      });

      if (roleFilter) {
        if (roleFilter === 'user') {
          return usersWithRoles.filter((u) => u.role === 'user' || u.role === null);
        }
        return usersWithRoles.filter((u) => u.role === roleFilter);
      }

      return usersWithRoles;
    },
  });
};
