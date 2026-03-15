export interface UserKYCProfile {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string;
  phone_number: string;
  email: string;
  national_id_number?: string;
  country_code: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_method: 'basic' | 'document' | 'selfie';
  risk_score: number;
  document_urls?: string[];
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BNPLPlan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  number_of_installments: number;
  installment_frequency_days: number;
  upfront_percentage: number;
  late_fee_amount: number;
  grace_period_days: number;
  enabled: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TicketBNPLConfig {
  id: string;
  pretix_organizer: string;
  pretix_event: string;
  pretix_item_id: number;
  bnpl_enabled: boolean;
  allowed_plan_ids: string[];
  minimum_upfront_percentage: number;
  maximum_ticket_price?: number;
  minimum_user_risk_score: number;
  max_days_before_event_for_final_payment: number;
  ticket_release_threshold_percentage: number;
  auto_cancel_on_missed_payment: boolean;
  created_at: string;
  updated_at: string;
}

export interface BNPLAgreement {
  id: string;
  agreement_number: string;
  user_id: string;
  kyc_profile_id: string;
  plan_id: string;
  pretix_organizer: string;
  pretix_event: string;
  pretix_item_id: number;
  ticket_price: number;
  total_amount: number;
  upfront_amount: number;
  remaining_amount: number;
  number_of_installments: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'defaulted';
  ticket_reservation_status: 'reserved' | 'released' | 'cancelled';
  terms_accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  event_date: string;
  final_payment_deadline: string;
  created_at: string;
  updated_at: string;
  plan?: BNPLPlan;
  installments?: InstallmentSchedule[];
  reservation?: TicketReservation;
}

export interface InstallmentSchedule {
  id: string;
  agreement_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  paid_at?: string;
  paid_amount: number;
  late_fee_applied: number;
  payment_method?: string;
  payment_provider_id?: string;
  grace_period_ends_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentAttempt {
  id: string;
  installment_id: string;
  agreement_id: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  payment_method?: string;
  payment_provider?: string;
  provider_transaction_id?: string;
  failure_reason?: string;
  attempted_at: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
}

export interface TicketReservation {
  id: string;
  agreement_id: string;
  user_id: string;
  pretix_organizer: string;
  pretix_event: string;
  pretix_item_id: number;
  pretix_variation_id?: number;
  quantity: number;
  reservation_status: 'reserved' | 'confirmed' | 'cancelled' | 'expired';
  reserved_at: string;
  confirmed_at?: string;
  expires_at?: string;
  pretix_order_code?: string;
  pretix_order_secret?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentReminder {
  id: string;
  installment_id: string;
  agreement_id: string;
  user_id: string;
  reminder_type: 'upcoming' | 'due_today' | 'overdue' | 'final_warning';
  days_before_due?: number;
  sent_at: string;
  channel: 'email' | 'sms' | 'push';
  status: 'sent' | 'failed' | 'clicked';
  created_at: string;
}

export interface RiskScore {
  id: string;
  user_id: string;
  score: number;
  factors: Record<string, unknown>;
  active_bnpl_count: number;
  missed_payment_count: number;
  total_bnpl_value: number;
  calculated_at: string;
  created_at: string;
}

export interface BNPLCheckoutData {
  plan_id: string;
  ticket_price: number;
  pretix_item_id: number;
  pretix_variation_id?: number;
  quantity: number;
  event_date: string;
}

export interface BNPLCalculation {
  total_amount: number;
  upfront_amount: number;
  remaining_amount: number;
  installment_amount: number;
  number_of_installments: number;
  schedule: Array<{
    installment_number: number;
    amount: number;
    due_date: string;
  }>;
}

export interface BNPLEligibility {
  eligible: boolean;
  reasons?: string[];
  required_risk_score?: number;
  user_risk_score?: number;
  max_price?: number;
  available_plans: BNPLPlan[];
}

export interface BNPLDashboardStats {
  total_agreements: number;
  active_agreements: number;
  completed_agreements: number;
  total_amount_financed: number;
  total_amount_paid: number;
  total_amount_remaining: number;
  next_payment_due?: {
    amount: number;
    due_date: string;
    installment_id: string;
  };
  overdue_count: number;
}

export interface AdminBNPLStats {
  total_active_agreements: number;
  total_revenue: number;
  default_rate: number;
  average_ticket_price: number;
  conversion_rate: number;
  missed_payments_count: number;
  at_risk_agreements: number;
  upcoming_payments_30_days: number;
}
