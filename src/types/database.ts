export type AppRole = 'admin' | 'owner' | 'user';
export type KycStatus = 'pending' | 'approved' | 'rejected';
export type BundleStatus = 'active' | 'exhausted' | 'expired';
export type SessionType = 'paid' | 'gift';
export type SegmentStatus = 'active' | 'ended' | 'expired' | 'error';
export type WalletTxType = 'recharge' | 'debit' | 'refund' | 'reward' | 'gift';
export type WalletTxStatus = 'pending' | 'confirmed' | 'failed';
export type GiftCreditType = 'first_time' | 'monthly' | 'referral';
export type ReferralEventType = 'signup' | 'first_purchase';
export type NotificationCategory = 'system' | 'promo' | 'session' | 'wallet' | 'bundle';
export type DevicePlatform = 'ios' | 'android' | 'web';
export type ApHealthStatus = 'ok' | 'degraded' | 'down';
export type ApStatus = 'online' | 'offline' | 'maintenance';

// ========== Existing (kept for backward compat) ==========

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
  wifi_zones?: WifiZone;
}

export interface Bundle {
  id: string;
  name: string;
  duration: number;
  duration_unit: 'Hours' | 'Days' | 'Weeks';
  price: number;
  currency: string;
  speed_profile_name: string | null;
  is_active: boolean;
  session_type: SessionType;
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
  terms_agreed_at: string | null;
  wallet_balance_xaf: number;
  referral_code: string | null;
  referred_by: string | null;
  first_trial_used_at: string | null;
  last_monthly_gift_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

// ========== v4 New Tables ==========

export interface Provider {
  id: string;
  user_id: string;
  business_name: string;
  phone: string | null;
  kyc_status: KycStatus;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccessPoint {
  id: string;
  provider_id: string;
  zone_label: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  ssid: string | null;
  bssid: string | null;
  propagation_radius_m: number;
  router_ip: string | null;
  router_type: string | null;
  router_user_encrypted: string | null;
  router_pass_encrypted: string | null;
  speed_profile_name: string | null;
  status: ApStatus;
  avg_rating: number;
  created_at: string;
  updated_at: string;
  // joined
  providers?: Provider;
}

export interface UserBundle {
  id: string;
  user_id: string;
  plan_id: string | null;
  session_type: SessionType;
  total_minutes: number;
  status: BundleStatus;
  purchased_at: string;
  expires_at: string | null;
  idempotency_key: string | null;
  // joined
  bundles?: Bundle;
}

export interface SessionSegment {
  id: string;
  bundle_id: string;
  ap_id: string | null;
  user_id: string;
  mac_address: string | null;
  ios_token: string | null;
  status: SegmentStatus;
  started_at: string;
  scheduled_end: string | null;
  ended_at: string | null;
  time_used_minutes: number;
  mikrotik_user_name: string | null;
  // joined
  access_points?: AccessPoint;
  user_bundles?: UserBundle;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: WalletTxType;
  amount_xaf: number;
  fee_xaf: number;
  net_xaf: number;
  reference: string;
  mansar_ref: string | null;
  status: WalletTxStatus;
  created_at: string;
}

export interface ProviderEarningsLedger {
  id: string;
  segment_id: string;
  bundle_id: string | null;
  ap_id: string | null;
  provider_id: string;
  time_used_minutes: number;
  plan_price_xaf: number;
  time_ratio: number;
  gross_xaf: number;
  platform_fee_xaf: number;
  net_xaf: number;
  allocated_at: string;
}

export interface ProviderWallet {
  provider_id: string;
  balance_xaf: number;
  updated_at: string;
}

export interface GiftCredit {
  id: string;
  user_id: string;
  type: GiftCreditType;
  minutes_total: number;
  minutes_remaining: number;
  granted_at: string;
  expires_at: string | null;
  exhausted_at: string | null;
}

export interface ReferralEvent {
  id: string;
  referrer_id: string;
  referred_id: string;
  event_type: ReferralEventType;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface DeviceToken {
  id: string;
  user_id: string;
  fcm_token: string;
  platform: DevicePlatform;
  updated_at: string;
}

export interface ApHealthLog {
  id: string;
  ap_id: string;
  latency_ms: number | null;
  status: ApHealthStatus;
  checked_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ========== Database Schema Type ==========

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
      providers: {
        Row: Provider;
        Insert: Omit<Provider, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Omit<Provider, 'id' | 'created_at' | 'updated_at'>>;
      };
      access_points: {
        Row: AccessPoint;
        Insert: Omit<AccessPoint, 'id' | 'created_at' | 'updated_at' | 'providers'> & { id?: string };
        Update: Partial<Omit<AccessPoint, 'id' | 'created_at' | 'updated_at' | 'providers'>>;
      };
      user_bundles: {
        Row: UserBundle;
        Insert: Omit<UserBundle, 'id' | 'bundles'> & { id?: string };
        Update: Partial<Omit<UserBundle, 'id' | 'bundles'>>;
      };
      session_segments: {
        Row: SessionSegment;
        Insert: Omit<SessionSegment, 'id' | 'access_points' | 'user_bundles'> & { id?: string };
        Update: Partial<Omit<SessionSegment, 'id' | 'access_points' | 'user_bundles'>>;
      };
      wallet_transactions: {
        Row: WalletTransaction;
        Insert: Omit<WalletTransaction, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<WalletTransaction, 'id' | 'created_at'>>;
      };
      provider_earnings_ledger: {
        Row: ProviderEarningsLedger;
        Insert: Omit<ProviderEarningsLedger, 'id'> & { id?: string };
        Update: Partial<Omit<ProviderEarningsLedger, 'id'>>;
      };
      provider_wallets: {
        Row: ProviderWallet;
        Insert: ProviderWallet;
        Update: Partial<ProviderWallet>;
      };
      gift_credits: {
        Row: GiftCredit;
        Insert: Omit<GiftCredit, 'id'> & { id?: string };
        Update: Partial<Omit<GiftCredit, 'id'>>;
      };
      referral_events: {
        Row: ReferralEvent;
        Insert: Omit<ReferralEvent, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<ReferralEvent, 'id' | 'created_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>;
      };
      device_tokens: {
        Row: DeviceToken;
        Insert: Omit<DeviceToken, 'id'> & { id?: string };
        Update: Partial<Omit<DeviceToken, 'id'>>;
      };
      ap_health_log: {
        Row: ApHealthLog;
        Insert: Omit<ApHealthLog, 'id'> & { id?: string };
        Update: Partial<Omit<ApHealthLog, 'id'>>;
      };
      admin_audit_log: {
        Row: AdminAuditLog;
        Insert: Omit<AdminAuditLog, 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<AdminAuditLog, 'id' | 'created_at'>>;
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
      get_dashboard_stats: {
        Args: Record<string, never>;
        Returns: {
          total_users: number;
          active_bundles: number;
          active_sessions: number;
          total_gmv_xaf: number;
          platform_revenue_xaf: number;
          total_providers: number;
          total_access_points: number;
          online_access_points: number;
        };
      };
    };
    Enums: {
      app_role: AppRole;
      kyc_status: KycStatus;
      bundle_status: BundleStatus;
      session_type: SessionType;
      segment_status: SegmentStatus;
      wallet_tx_type: WalletTxType;
      wallet_tx_status: WalletTxStatus;
      gift_credit_type: GiftCreditType;
      referral_event_type: ReferralEventType;
      notification_category: NotificationCategory;
      device_platform: DevicePlatform;
      ap_health_status: ApHealthStatus;
      ap_status: ApStatus;
    };
  };
}
