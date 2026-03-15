import { config } from '../config/env';
import type {
  PretixEvent,
  PretixItem,
  PretixCategory,
  PretixQuestion,
  PretixQuota,
  PretixVoucher,
  PretixCartPosition,
  PretixOrder,
  PretixPaymentProvider,
} from '../../types/pretix';

class PretixAPIClient {
  private baseUrl: string;
  private organizer: string;
  private event: string;

  constructor() {
    this.baseUrl = config.pretix.apiUrl;
    this.organizer = config.pretix.organizer;
    this.event = config.pretix.event;
  }

  private getUrl(path: string): string {
    return `${this.baseUrl}/api/v1${path}`;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = this.getUrl(path);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Token ${config.pretix.apiToken}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new PretixAPIError(
          response.status,
          response.statusText,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof PretixAPIError) {
        throw error;
      }
      throw new PretixAPIError(0, 'Network error', { error });
    }
  }

  async getEvent(): Promise<PretixEvent> {
    return this.request<PretixEvent>(
      `/organizers/${this.organizer}/events/${this.event}/`
    );
  }

  async getItems(): Promise<{ results: PretixItem[] }> {
    return this.request<{ results: PretixItem[] }>(
      `/organizers/${this.organizer}/events/${this.event}/items/`
    );
  }

  async getItem(itemId: number): Promise<PretixItem> {
    return this.request<PretixItem>(
      `/organizers/${this.organizer}/events/${this.event}/items/${itemId}/`
    );
  }

  async getCategories(): Promise<{ results: PretixCategory[] }> {
    return this.request<{ results: PretixCategory[] }>(
      `/organizers/${this.organizer}/events/${this.event}/categories/`
    );
  }

  async getQuestions(): Promise<{ results: PretixQuestion[] }> {
    return this.request<{ results: PretixQuestion[] }>(
      `/organizers/${this.organizer}/events/${this.event}/questions/`
    );
  }

  async getQuotas(): Promise<{ results: PretixQuota[] }> {
    return this.request<{ results: PretixQuota[] }>(
      `/organizers/${this.organizer}/events/${this.event}/quotas/`
    );
  }

  async checkVoucher(code: string): Promise<PretixVoucher> {
    return this.request<PretixVoucher>(
      `/organizers/${this.organizer}/events/${this.event}/vouchers/${code}/`
    );
  }

  async createCart(positions: Omit<PretixCartPosition, 'id' | 'cart_id'>[]): Promise<{ id: string; positions: PretixCartPosition[] }> {
    return this.request<{ id: string; positions: PretixCartPosition[] }>(
      `/organizers/${this.organizer}/events/${this.event}/cart/`,
      {
        method: 'POST',
        body: JSON.stringify({ positions }),
      }
    );
  }

  async getCart(cartId: string): Promise<{ positions: PretixCartPosition[] }> {
    return this.request<{ positions: PretixCartPosition[] }>(
      `/organizers/${this.organizer}/events/${this.event}/cart/${cartId}/`
    );
  }

  async updateCartPosition(
    cartId: string,
    positionId: number,
    data: Partial<PretixCartPosition>
  ): Promise<PretixCartPosition> {
    return this.request<PretixCartPosition>(
      `/organizers/${this.organizer}/events/${this.event}/cart/${cartId}/positions/${positionId}/`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteCartPosition(cartId: string, positionId: number): Promise<void> {
    await this.request(
      `/organizers/${this.organizer}/events/${this.event}/cart/${cartId}/positions/${positionId}/`,
      {
        method: 'DELETE',
      }
    );
  }

  async clearCart(cartId: string): Promise<void> {
    await this.request(
      `/organizers/${this.organizer}/events/${this.event}/cart/${cartId}/`,
      {
        method: 'DELETE',
      }
    );
  }

  async createOrder(
    cartId: string,
    data: {
      email: string;
      locale: string;
      payment_provider: string;
      invoice_address?: Partial<PretixOrder['invoice_address']>;
      positions?: Partial<PretixCartPosition>[];
    }
  ): Promise<PretixOrder> {
    return this.request<PretixOrder>(
      `/organizers/${this.organizer}/events/${this.event}/orders/`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async getOrder(orderCode: string, secret: string): Promise<PretixOrder> {
    return this.request<PretixOrder>(
      `/organizers/${this.organizer}/events/${this.event}/orders/${orderCode}/?secret=${secret}`
    );
  }

  async getPaymentProviders(): Promise<{ results: PretixPaymentProvider[] }> {
    return this.request<{ results: PretixPaymentProvider[] }>(
      `/organizers/${this.organizer}/events/${this.event}/settings/payment/`
    );
  }

  async initiatePayment(
    orderCode: string,
    secret: string,
    paymentProvider: string
  ): Promise<{ payment_url?: string }> {
    return this.request<{ payment_url?: string }>(
      `/organizers/${this.organizer}/events/${this.event}/orders/${orderCode}/payments/`,
      {
        method: 'POST',
        body: JSON.stringify({
          provider: paymentProvider,
          secret,
        }),
      }
    );
  }
}

export class PretixAPIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data: unknown
  ) {
    super(`Pretix API Error: ${status} ${statusText}`);
    this.name = 'PretixAPIError';
  }
}

export const pretixClient = new PretixAPIClient();
