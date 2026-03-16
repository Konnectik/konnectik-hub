export type AppRole = 'admin' | 'owner' | 'user';

export interface WifiZone {
  id: string;
  owner_id: string | null;
  name: string;
  location: string;
  radius: number;
  bandwidth: number;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
}

export interface RouterDevice {
  id: string;
  zone_id: string;
  name: string;
  username: string;
  password: string;
  status: 'Online' | 'Offline';
  created_at: string;
  updated_at: string;
  // joined
  wifi_zones?: WifiZone;
}

export interface Bundle {
  id: string;
  name: string;
  duration: number;
  duration_unit: 'Hours' | 'Days' | 'Weeks';
  price: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string | null;
  zone_id: string | null;
  bundle_id: string | null;
  user_name: string;
  zone_name: string;
  bundle_name: string;
  amount: number;
  currency: string;
  type: 'credit' | 'withdrawal';
  status: 'Completed' | 'Pending' | 'Failed';
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  company: string | null;
  avatar_url: string | null;
  gender: 'male' | 'female' | null;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_roles: {
        Row: UserRole;
        Insert: { id?: string; user_id: string; role: AppRole };
        Update: { role?: AppRole };
      };
      wifi_zones: {
        Row: WifiZone;
        Insert: Omit<WifiZone, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<WifiZone, 'id' | 'created_at' | 'updated_at'>>;
      };
      routers: {
        Row: RouterDevice;
        Insert: Omit<RouterDevice, 'id' | 'created_at' | 'updated_at' | 'wifi_zones'> & { id?: string };
        Update: Partial<Omit<RouterDevice, 'id' | 'created_at' | 'updated_at' | 'wifi_zones'>>;
      };
      bundles: {
        Row: Bundle;
        Insert: Omit<Bundle, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Bundle, 'id' | 'created_at' | 'updated_at'>>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Transaction, 'id' | 'created_at'>>;
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
