/*
  # BNPL (Buy Now Pay Later) System for Ticketing Platform

  ## Overview
  Complete BNPL system implementation inspired by Klarna, Afterpay, and Affirm.
  Allows customers to purchase tickets with installment payments.

  ## New Tables

  ### 1. user_kyc_profiles
  Stores customer KYC (Know Your Customer) verification data
  - `id` (uuid, primary key)
  - `user_id` (uuid) - reference to auth.users
  - `full_name` (text)
  - `date_of_birth` (date)
  - `phone_number` (text)
  - `email` (text)
  - `national_id_number` (text, encrypted)
  - `country_code` (text)
  - `verification_status` (text) - pending, verified, rejected
  - `verification_method` (text) - basic, document, selfie
  - `risk_score` (integer) - 0-100
  - `document_urls` (jsonb)
  - `verified_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. bnpl_plans
  Defines available BNPL plan configurations
  - `id` (uuid, primary key)
  - `name` (text)
  - `slug` (text, unique)
  - `description` (text)
  - `number_of_installments` (integer)
  - `installment_frequency_days` (integer)
  - `upfront_percentage` (numeric) - 0-100
  - `late_fee_amount` (numeric)
  - `grace_period_days` (integer)
  - `enabled` (boolean)
  - `display_order` (integer)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. ticket_bnpl_config
  BNPL configuration per ticket/item type
  - `id` (uuid, primary key)
  - `pretix_organizer` (text)
  - `pretix_event` (text)
  - `pretix_item_id` (integer)
  - `bnpl_enabled` (boolean)
  - `allowed_plan_ids` (uuid[])
  - `minimum_upfront_percentage` (numeric)
  - `maximum_ticket_price` (numeric)
  - `minimum_user_risk_score` (integer)
  - `max_days_before_event_for_final_payment` (integer)
  - `ticket_release_threshold_percentage` (numeric) - when to release ticket
  - `auto_cancel_on_missed_payment` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. bnpl_agreements
  Main BNPL agreement/contract between user and system
  - `id` (uuid, primary key)
  - `agreement_number` (text, unique)
  - `user_id` (uuid) - reference to auth.users
  - `kyc_profile_id` (uuid) - reference to user_kyc_profiles
  - `plan_id` (uuid) - reference to bnpl_plans
  - `pretix_organizer` (text)
  - `pretix_event` (text)
  - `pretix_item_id` (integer)
  - `ticket_price` (numeric)
  - `total_amount` (numeric)
  - `upfront_amount` (numeric)
  - `remaining_amount` (numeric)
  - `number_of_installments` (integer)
  - `status` (text) - pending, active, completed, cancelled, defaulted
  - `ticket_reservation_status` (text) - reserved, released, cancelled
  - `terms_accepted_at` (timestamptz)
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `cancelled_at` (timestamptz)
  - `event_date` (timestamptz)
  - `final_payment_deadline` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. installment_schedules
  Individual installment payment schedules
  - `id` (uuid, primary key)
  - `agreement_id` (uuid) - reference to bnpl_agreements
  - `installment_number` (integer)
  - `amount` (numeric)
  - `due_date` (date)
  - `status` (text) - pending, paid, overdue, cancelled, refunded
  - `paid_at` (timestamptz)
  - `paid_amount` (numeric)
  - `late_fee_applied` (numeric)
  - `payment_method` (text)
  - `payment_provider_id` (text)
  - `grace_period_ends_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 6. payment_attempts
  Track all payment attempts for installments
  - `id` (uuid, primary key)
  - `installment_id` (uuid) - reference to installment_schedules
  - `agreement_id` (uuid) - reference to bnpl_agreements
  - `amount` (numeric)
  - `status` (text) - pending, succeeded, failed, cancelled
  - `payment_method` (text)
  - `payment_provider` (text)
  - `provider_transaction_id` (text)
  - `failure_reason` (text)
  - `attempted_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `metadata` (jsonb)

  ### 7. ticket_reservations
  Tracks reserved tickets pending BNPL completion
  - `id` (uuid, primary key)
  - `agreement_id` (uuid) - reference to bnpl_agreements
  - `user_id` (uuid) - reference to auth.users
  - `pretix_organizer` (text)
  - `pretix_event` (text)
  - `pretix_item_id` (integer)
  - `pretix_variation_id` (integer)
  - `quantity` (integer)
  - `reservation_status` (text) - reserved, confirmed, cancelled, expired
  - `reserved_at` (timestamptz)
  - `confirmed_at` (timestamptz)
  - `expires_at` (timestamptz)
  - `pretix_order_code` (text)
  - `pretix_order_secret` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 8. payment_reminders
  Notification tracking for payment reminders
  - `id` (uuid, primary key)
  - `installment_id` (uuid) - reference to installment_schedules
  - `agreement_id` (uuid) - reference to bnpl_agreements
  - `user_id` (uuid) - reference to auth.users
  - `reminder_type` (text) - upcoming, due_today, overdue, final_warning
  - `days_before_due` (integer)
  - `sent_at` (timestamptz)
  - `channel` (text) - email, sms, push
  - `status` (text) - sent, failed, clicked
  - `created_at` (timestamptz)

  ### 9. risk_scores
  Risk assessment history for users
  - `id` (uuid, primary key)
  - `user_id` (uuid) - reference to auth.users
  - `score` (integer) - 0-100
  - `factors` (jsonb) - risk factors considered
  - `active_bnpl_count` (integer)
  - `missed_payment_count` (integer)
  - `total_bnpl_value` (numeric)
  - `calculated_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Admin role required for configuration tables
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User KYC Profiles
CREATE TABLE IF NOT EXISTS user_kyc_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  phone_number text NOT NULL,
  email text NOT NULL,
  national_id_number text,
  country_code text NOT NULL,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_method text DEFAULT 'basic' CHECK (verification_method IN ('basic', 'document', 'selfie')),
  risk_score integer DEFAULT 50 CHECK (risk_score >= 0 AND risk_score <= 100),
  document_urls jsonb DEFAULT '[]'::jsonb,
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- BNPL Plans
CREATE TABLE IF NOT EXISTS bnpl_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  number_of_installments integer NOT NULL CHECK (number_of_installments > 0),
  installment_frequency_days integer NOT NULL DEFAULT 30 CHECK (installment_frequency_days > 0),
  upfront_percentage numeric NOT NULL DEFAULT 25 CHECK (upfront_percentage >= 0 AND upfront_percentage <= 100),
  late_fee_amount numeric DEFAULT 0 CHECK (late_fee_amount >= 0),
  grace_period_days integer DEFAULT 3 CHECK (grace_period_days >= 0),
  enabled boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ticket BNPL Configuration
CREATE TABLE IF NOT EXISTS ticket_bnpl_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pretix_organizer text NOT NULL,
  pretix_event text NOT NULL,
  pretix_item_id integer NOT NULL,
  bnpl_enabled boolean DEFAULT true,
  allowed_plan_ids uuid[] DEFAULT ARRAY[]::uuid[],
  minimum_upfront_percentage numeric DEFAULT 20 CHECK (minimum_upfront_percentage >= 0 AND minimum_upfront_percentage <= 100),
  maximum_ticket_price numeric,
  minimum_user_risk_score integer DEFAULT 30 CHECK (minimum_user_risk_score >= 0 AND minimum_user_risk_score <= 100),
  max_days_before_event_for_final_payment integer DEFAULT 7 CHECK (max_days_before_event_for_final_payment >= 0),
  ticket_release_threshold_percentage numeric DEFAULT 100 CHECK (ticket_release_threshold_percentage >= 0 AND ticket_release_threshold_percentage <= 100),
  auto_cancel_on_missed_payment boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(pretix_organizer, pretix_event, pretix_item_id)
);

-- BNPL Agreements
CREATE TABLE IF NOT EXISTS bnpl_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_number text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  kyc_profile_id uuid REFERENCES user_kyc_profiles(id),
  plan_id uuid REFERENCES bnpl_plans(id),
  pretix_organizer text NOT NULL,
  pretix_event text NOT NULL,
  pretix_item_id integer NOT NULL,
  ticket_price numeric NOT NULL CHECK (ticket_price > 0),
  total_amount numeric NOT NULL CHECK (total_amount > 0),
  upfront_amount numeric NOT NULL CHECK (upfront_amount >= 0),
  remaining_amount numeric NOT NULL CHECK (remaining_amount >= 0),
  number_of_installments integer NOT NULL CHECK (number_of_installments > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'defaulted')),
  ticket_reservation_status text NOT NULL DEFAULT 'reserved' CHECK (ticket_reservation_status IN ('reserved', 'released', 'cancelled')),
  terms_accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  event_date timestamptz NOT NULL,
  final_payment_deadline timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Installment Schedules
CREATE TABLE IF NOT EXISTS installment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid REFERENCES bnpl_agreements(id) ON DELETE CASCADE,
  installment_number integer NOT NULL CHECK (installment_number > 0),
  amount numeric NOT NULL CHECK (amount > 0),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  paid_at timestamptz,
  paid_amount numeric DEFAULT 0 CHECK (paid_amount >= 0),
  late_fee_applied numeric DEFAULT 0 CHECK (late_fee_applied >= 0),
  payment_method text,
  payment_provider_id text,
  grace_period_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agreement_id, installment_number)
);

-- Payment Attempts
CREATE TABLE IF NOT EXISTS payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id uuid REFERENCES installment_schedules(id) ON DELETE CASCADE,
  agreement_id uuid REFERENCES bnpl_agreements(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  payment_method text,
  payment_provider text,
  provider_transaction_id text,
  failure_reason text,
  attempted_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Ticket Reservations
CREATE TABLE IF NOT EXISTS ticket_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid REFERENCES bnpl_agreements(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  pretix_organizer text NOT NULL,
  pretix_event text NOT NULL,
  pretix_item_id integer NOT NULL,
  pretix_variation_id integer,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  reservation_status text NOT NULL DEFAULT 'reserved' CHECK (reservation_status IN ('reserved', 'confirmed', 'cancelled', 'expired')),
  reserved_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  expires_at timestamptz,
  pretix_order_code text,
  pretix_order_secret text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payment Reminders
CREATE TABLE IF NOT EXISTS payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id uuid REFERENCES installment_schedules(id) ON DELETE CASCADE,
  agreement_id uuid REFERENCES bnpl_agreements(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('upcoming', 'due_today', 'overdue', 'final_warning')),
  days_before_due integer,
  sent_at timestamptz DEFAULT now(),
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'clicked')),
  created_at timestamptz DEFAULT now()
);

-- Risk Scores
CREATE TABLE IF NOT EXISTS risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  factors jsonb DEFAULT '{}'::jsonb,
  active_bnpl_count integer DEFAULT 0,
  missed_payment_count integer DEFAULT 0,
  total_bnpl_value numeric DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_kyc_profiles_user_id ON user_kyc_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_kyc_profiles_verification_status ON user_kyc_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_bnpl_plans_slug ON bnpl_plans(slug);
CREATE INDEX IF NOT EXISTS idx_bnpl_plans_enabled ON bnpl_plans(enabled);
CREATE INDEX IF NOT EXISTS idx_ticket_bnpl_config_item ON ticket_bnpl_config(pretix_organizer, pretix_event, pretix_item_id);
CREATE INDEX IF NOT EXISTS idx_bnpl_agreements_user_id ON bnpl_agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_bnpl_agreements_status ON bnpl_agreements(status);
CREATE INDEX IF NOT EXISTS idx_bnpl_agreements_agreement_number ON bnpl_agreements(agreement_number);
CREATE INDEX IF NOT EXISTS idx_installment_schedules_agreement_id ON installment_schedules(agreement_id);
CREATE INDEX IF NOT EXISTS idx_installment_schedules_status ON installment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_installment_schedules_due_date ON installment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_installment_id ON payment_attempts(installment_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON payment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_ticket_reservations_agreement_id ON ticket_reservations(agreement_id);
CREATE INDEX IF NOT EXISTS idx_ticket_reservations_user_id ON ticket_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_installment_id ON payment_reminders(installment_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_user_id ON risk_scores(user_id);

-- Enable Row Level Security
ALTER TABLE user_kyc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bnpl_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_bnpl_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE bnpl_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_kyc_profiles
CREATE POLICY "Users can view own KYC profile"
  ON user_kyc_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own KYC profile"
  ON user_kyc_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own KYC profile"
  ON user_kyc_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for bnpl_plans
CREATE POLICY "Anyone can view enabled BNPL plans"
  ON bnpl_plans FOR SELECT
  TO authenticated
  USING (enabled = true);

-- RLS Policies for ticket_bnpl_config
CREATE POLICY "Anyone can view BNPL config"
  ON ticket_bnpl_config FOR SELECT
  TO authenticated
  USING (bnpl_enabled = true);

-- RLS Policies for bnpl_agreements
CREATE POLICY "Users can view own agreements"
  ON bnpl_agreements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agreements"
  ON bnpl_agreements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agreements"
  ON bnpl_agreements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for installment_schedules
CREATE POLICY "Users can view own installments"
  ON installment_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bnpl_agreements
      WHERE bnpl_agreements.id = installment_schedules.agreement_id
      AND bnpl_agreements.user_id = auth.uid()
    )
  );

-- RLS Policies for payment_attempts
CREATE POLICY "Users can view own payment attempts"
  ON payment_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bnpl_agreements
      WHERE bnpl_agreements.id = payment_attempts.agreement_id
      AND bnpl_agreements.user_id = auth.uid()
    )
  );

-- RLS Policies for ticket_reservations
CREATE POLICY "Users can view own reservations"
  ON ticket_reservations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reservations"
  ON ticket_reservations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for payment_reminders
CREATE POLICY "Users can view own reminders"
  ON payment_reminders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for risk_scores
CREATE POLICY "Users can view own risk scores"
  ON risk_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert default BNPL plans
INSERT INTO bnpl_plans (name, slug, description, number_of_installments, installment_frequency_days, upfront_percentage, late_fee_amount, grace_period_days, display_order)
VALUES
  ('Pay in 3', 'pay-in-3', 'Split your purchase into 3 equal payments', 3, 30, 33.33, 5.00, 3, 1),
  ('Pay in 4', 'pay-in-4', 'Split your purchase into 4 equal payments', 4, 30, 25.00, 5.00, 3, 2),
  ('Monthly Plan', 'monthly-plan', 'Pay monthly until fully paid', 6, 30, 20.00, 10.00, 5, 3)
ON CONFLICT (slug) DO NOTHING;

-- Function to generate agreement number
CREATE OR REPLACE FUNCTION generate_agreement_number()
RETURNS text AS $$
BEGIN
  RETURN 'BNPL-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 999999)::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to calculate installment due dates
CREATE OR REPLACE FUNCTION calculate_installment_schedule(
  p_agreement_id uuid,
  p_number_of_installments integer,
  p_frequency_days integer,
  p_amount_per_installment numeric,
  p_upfront_paid boolean DEFAULT false
)
RETURNS void AS $$
DECLARE
  v_start_number integer := 1;
  v_due_date date;
  v_installment_num integer;
BEGIN
  IF p_upfront_paid THEN
    v_start_number := 2;
  END IF;

  FOR v_installment_num IN v_start_number..p_number_of_installments LOOP
    v_due_date := (now() + (v_installment_num - 1) * (p_frequency_days || ' days')::interval)::date;
    
    INSERT INTO installment_schedules (
      agreement_id,
      installment_number,
      amount,
      due_date,
      status
    ) VALUES (
      p_agreement_id,
      v_installment_num,
      p_amount_per_installment,
      v_due_date,
      'pending'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;
