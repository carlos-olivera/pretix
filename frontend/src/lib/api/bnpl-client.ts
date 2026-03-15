import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';
import type {
  UserKYCProfile,
  BNPLPlan,
  TicketBNPLConfig,
  BNPLAgreement,
  InstallmentSchedule,
  PaymentAttempt,
  TicketReservation,
  RiskScore,
  BNPLCheckoutData,
  BNPLCalculation,
  BNPLEligibility,
  BNPLDashboardStats,
} from '../../types/bnpl';

// Lazy initialization: only create Supabase client when actually needed
// This prevents crashes when BNPL/Supabase env vars are not configured
let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!_supabase) {
    if (!config.supabase.url || !config.supabase.anonKey) {
      throw new Error('BNPL is not configured: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
    }
    _supabase = createClient(config.supabase.url, config.supabase.anonKey);
  }
  return _supabase;
}

const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

export class BNPLClient {
  async getKYCProfile(userId: string): Promise<UserKYCProfile | null> {
    const { data, error } = await supabase
      .from('user_kyc_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async createKYCProfile(profile: Omit<UserKYCProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserKYCProfile> {
    const { data, error } = await supabase
      .from('user_kyc_profiles')
      .insert(profile)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateKYCProfile(userId: string, updates: Partial<UserKYCProfile>): Promise<UserKYCProfile> {
    const { data, error } = await supabase
      .from('user_kyc_profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAvailablePlans(): Promise<BNPLPlan[]> {
    const { data, error } = await supabase
      .from('bnpl_plans')
      .select('*')
      .eq('enabled', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getPlan(planId: string): Promise<BNPLPlan | null> {
    const { data, error } = await supabase
      .from('bnpl_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getTicketBNPLConfig(
    organizer: string,
    event: string,
    itemId: number
  ): Promise<TicketBNPLConfig | null> {
    const { data, error } = await supabase
      .from('ticket_bnpl_config')
      .select('*')
      .eq('pretix_organizer', organizer)
      .eq('pretix_event', event)
      .eq('pretix_item_id', itemId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async checkBNPLEligibility(
    userId: string,
    itemId: number,
    ticketPrice: number
  ): Promise<BNPLEligibility> {
    const config = await this.getTicketBNPLConfig(
      'default-organizer',
      'default-event',
      itemId
    );

    if (!config || !config.bnpl_enabled) {
      return {
        eligible: false,
        reasons: ['BNPL not available for this ticket'],
        available_plans: [],
      };
    }

    if (config.maximum_ticket_price && ticketPrice > config.maximum_ticket_price) {
      return {
        eligible: false,
        reasons: ['Ticket price exceeds maximum for BNPL'],
        max_price: config.maximum_ticket_price,
        available_plans: [],
      };
    }

    const riskScore = await this.getUserRiskScore(userId);

    if (riskScore && riskScore.score < config.minimum_user_risk_score) {
      return {
        eligible: false,
        reasons: ['Risk score too low for BNPL'],
        required_risk_score: config.minimum_user_risk_score,
        user_risk_score: riskScore.score,
        available_plans: [],
      };
    }

    const availablePlans = await this.getAvailablePlans();
    const allowedPlans = config.allowed_plan_ids.length > 0
      ? availablePlans.filter(p => config.allowed_plan_ids.includes(p.id))
      : availablePlans;

    return {
      eligible: true,
      available_plans: allowedPlans,
      user_risk_score: riskScore?.score,
    };
  }

  async getUserRiskScore(userId: string): Promise<RiskScore | null> {
    const { data, error } = await supabase
      .from('risk_scores')
      .select('*')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async calculateBNPL(
    planId: string,
    ticketPrice: number,
    eventDate: string
  ): Promise<BNPLCalculation> {
    const plan = await this.getPlan(planId);
    if (!plan) throw new Error('Plan not found');

    const totalAmount = ticketPrice;
    const upfrontAmount = (totalAmount * plan.upfront_percentage) / 100;
    const remainingAmount = totalAmount - upfrontAmount;
    const numberOfInstallments = plan.number_of_installments;
    const installmentAmount = remainingAmount / (numberOfInstallments - 1);

    const schedule = [];
    const now = new Date();

    for (let i = 1; i <= numberOfInstallments; i++) {
      const daysToAdd = (i - 1) * plan.installment_frequency_days;
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + daysToAdd);

      schedule.push({
        installment_number: i,
        amount: i === 1 ? upfrontAmount : installmentAmount,
        due_date: dueDate.toISOString().split('T')[0],
      });
    }

    return {
      total_amount: totalAmount,
      upfront_amount: upfrontAmount,
      remaining_amount: remainingAmount,
      installment_amount,
      number_of_installments: numberOfInstallments,
      schedule,
    };
  }

  async createAgreement(
    userId: string,
    checkoutData: BNPLCheckoutData
  ): Promise<BNPLAgreement> {
    const kycProfile = await this.getKYCProfile(userId);
    if (!kycProfile || kycProfile.verification_status !== 'verified') {
      throw new Error('KYC verification required');
    }

    const calculation = await this.calculateBNPL(
      checkoutData.plan_id,
      checkoutData.ticket_price,
      checkoutData.event_date
    );

    const eventDate = new Date(checkoutData.event_date);
    const finalPaymentDeadline = new Date(eventDate);
    finalPaymentDeadline.setDate(finalPaymentDeadline.getDate() - 7);

    const { data, error } = await supabase.rpc('generate_agreement_number');
    if (error) throw error;
    const agreementNumber = data;

    const agreementData = {
      agreement_number: agreementNumber,
      user_id: userId,
      kyc_profile_id: kycProfile.id,
      plan_id: checkoutData.plan_id,
      pretix_organizer: config.pretix.organizer,
      pretix_event: config.pretix.event,
      pretix_item_id: checkoutData.pretix_item_id,
      ticket_price: checkoutData.ticket_price,
      total_amount: calculation.total_amount,
      upfront_amount: calculation.upfront_amount,
      remaining_amount: calculation.remaining_amount,
      number_of_installments: calculation.number_of_installments,
      status: 'pending',
      ticket_reservation_status: 'reserved',
      event_date: checkoutData.event_date,
      final_payment_deadline: finalPaymentDeadline.toISOString(),
    };

    const { data: agreement, error: agreementError } = await supabase
      .from('bnpl_agreements')
      .insert(agreementData)
      .select()
      .single();

    if (agreementError) throw agreementError;

    return agreement;
  }

  async getUserAgreements(userId: string): Promise<BNPLAgreement[]> {
    const { data, error } = await supabase
      .from('bnpl_agreements')
      .select(`
        *,
        plan:bnpl_plans(*),
        installments:installment_schedules(*),
        reservation:ticket_reservations(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getAgreement(agreementId: string): Promise<BNPLAgreement | null> {
    const { data, error } = await supabase
      .from('bnpl_agreements')
      .select(`
        *,
        plan:bnpl_plans(*),
        installments:installment_schedules(*),
        reservation:ticket_reservations(*)
      `)
      .eq('id', agreementId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getInstallments(agreementId: string): Promise<InstallmentSchedule[]> {
    const { data, error } = await supabase
      .from('installment_schedules')
      .select('*')
      .eq('agreement_id', agreementId)
      .order('installment_number', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getUpcomingInstallments(userId: string, days: number = 30): Promise<InstallmentSchedule[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const { data, error } = await supabase
      .from('installment_schedules')
      .select(`
        *,
        agreement:bnpl_agreements!inner(user_id)
      `)
      .eq('agreement.user_id', userId)
      .eq('status', 'pending')
      .lte('due_date', futureDate.toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createPaymentAttempt(
    installmentId: string,
    agreementId: string,
    amount: number,
    paymentMethod: string
  ): Promise<PaymentAttempt> {
    const { data, error } = await supabase
      .from('payment_attempts')
      .insert({
        installment_id: installmentId,
        agreement_id: agreementId,
        amount,
        payment_method: paymentMethod,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updatePaymentAttempt(
    attemptId: string,
    updates: Partial<PaymentAttempt>
  ): Promise<PaymentAttempt> {
    const { data, error } = await supabase
      .from('payment_attempts')
      .update(updates)
      .eq('id', attemptId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getDashboardStats(userId: string): Promise<BNPLDashboardStats> {
    const agreements = await this.getUserAgreements(userId);

    const totalAgreements = agreements.length;
    const activeAgreements = agreements.filter(a => a.status === 'active').length;
    const completedAgreements = agreements.filter(a => a.status === 'completed').length;

    const totalAmountFinanced = agreements.reduce((sum, a) => sum + a.total_amount, 0);

    let totalAmountPaid = 0;
    let overdueCount = 0;

    for (const agreement of agreements) {
      if (agreement.installments) {
        totalAmountPaid += agreement.installments
          .filter(i => i.status === 'paid')
          .reduce((sum, i) => sum + i.paid_amount, 0);

        overdueCount += agreement.installments
          .filter(i => i.status === 'overdue')
          .length;
      }
    }

    const totalAmountRemaining = totalAmountFinanced - totalAmountPaid;

    const upcomingInstallments = await this.getUpcomingInstallments(userId, 30);
    const nextPayment = upcomingInstallments.length > 0
      ? {
          amount: upcomingInstallments[0].amount,
          due_date: upcomingInstallments[0].due_date,
          installment_id: upcomingInstallments[0].id,
        }
      : undefined;

    return {
      total_agreements: totalAgreements,
      active_agreements: activeAgreements,
      completed_agreements: completedAgreements,
      total_amount_financed: totalAmountFinanced,
      total_amount_paid: totalAmountPaid,
      total_amount_remaining: totalAmountRemaining,
      next_payment_due: nextPayment,
      overdue_count: overdueCount,
    };
  }
}

export const bnplClient = new BNPLClient();
