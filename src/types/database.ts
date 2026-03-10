export type AppRole = 'admin' | 'owner' | 'user';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          address: string | null;
          company: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          address?: string | null;
          company?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string;
          email?: string;
          phone?: string | null;
          address?: string | null;
          company?: string | null;
          avatar_url?: string | null;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: AppRole;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: AppRole;
        };
        Update: {
          role?: AppRole;
        };
      };
    };
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: AppRole };
        Returns: boolean;
      };
      get_user_role: {
        Args: { _user_id: string };
        Returns: AppRole | null;
      };
    };
    Enums: {
      app_role: AppRole;
    };
  };
}
