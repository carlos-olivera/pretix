import { config } from '../config/env';
import type {
  BNPLEligibility,
  BNPLAgreement,
  BNPLCheckoutData,
} from '../../types/bnpl';

class BNPLService {
  private supabaseUrl: string;

  constructor() {
    this.supabaseUrl = config.supabase.url;
  }

  private async callEdgeFunction<T>(
    functionName: string,
    data: unknown,
    token?: string
  ): Promise<T> {
    const url = `${this.supabaseUrl}/functions/v1/${functionName}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async checkEligibility(
    userId: string,
    itemId: number,
    ticketPrice: number,
    organizer: string,
    event: string,
    token?: string
  ): Promise<BNPLEligibility> {
    return this.callEdgeFunction<BNPLEligibility>(
      'bnpl-eligibility',
      {
        user_id: userId,
        item_id: itemId,
        ticket_price: ticketPrice,
        organizer,
        event,
      },
      token
    );
  }

  async createAgreement(
    checkoutData: BNPLCheckoutData & { user_id: string },
    token?: string
  ): Promise<{ success: boolean; agreement: BNPLAgreement }> {
    return this.callEdgeFunction(
      'bnpl-create-agreement',
      {
        user_id: checkoutData.user_id,
        plan_id: checkoutData.plan_id,
        pretix_organizer: checkoutData.pretix_organizer || config.pretix.organizer,
        pretix_event: checkoutData.pretix_event || config.pretix.event,
        pretix_item_id: checkoutData.pretix_item_id,
        pretix_variation_id: checkoutData.pretix_variation_id,
        ticket_price: checkoutData.ticket_price,
        event_date: checkoutData.event_date,
        quantity: checkoutData.quantity || 1,
      },
      token
    );
  }

  async processPayment(
    installmentId: string,
    paymentMethod: string,
    paymentProvider?: string,
    providerTransactionId?: string,
    token?: string
  ): Promise<{
    success: boolean;
    installment_status: string;
    remaining_amount: number;
    agreement_status: string;
    ticket_released: boolean;
  }> {
    return this.callEdgeFunction(
      'bnpl-process-payment',
      {
        installment_id: installmentId,
        payment_method: paymentMethod,
        payment_provider: paymentProvider,
        provider_transaction_id: providerTransactionId,
      },
      token
    );
  }

  async releaseTicket(
    agreementId: string,
    email: string,
    token?: string
  ): Promise<{
    success: boolean;
    order_code: string;
    order_secret: string;
    order_url: string;
  }> {
    return this.callEdgeFunction(
      'bnpl-release-ticket',
      {
        agreement_id: agreementId,
        email,
      },
      token
    );
  }
}

export const bnplService = new BNPLService();
