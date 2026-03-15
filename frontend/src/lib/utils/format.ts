import type { PretixMultiLingualString } from '../../types/pretix';

export function formatPrice(price: string | number, currency: string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency,
  }).format(numPrice);
}

export function formatDate(dateString: string, locale: string = 'es'): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateShort(dateString: string, locale: string = 'es'): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function getLocalizedString(
  multiLingualString: PretixMultiLingualString | null | undefined,
  locale: string = 'es',
  fallbackLocale: string = 'en'
): string {
  if (!multiLingualString) return '';

  return (
    multiLingualString[locale] ||
    multiLingualString[fallbackLocale] ||
    Object.values(multiLingualString)[0] ||
    ''
  );
}

export function calculateCartTotal(
  positions: Array<{ price: string; quantity?: number }>
): number {
  return positions.reduce((total, pos) => {
    const price = parseFloat(pos.price);
    const quantity = pos.quantity || 1;
    return total + price * quantity;
  }, 0);
}

export function getOrderStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    'n': 'pending',
    'p': 'paid',
    'e': 'expired',
    'c': 'canceled',
  };
  return statusMap[status] || status;
}

export function isEventAvailable(event: {
  presale_start: string | null;
  presale_end: string | null;
  is_public: boolean;
}): boolean {
  if (!event.is_public) return false;

  const now = new Date();

  if (event.presale_start) {
    const start = new Date(event.presale_start);
    if (now < start) return false;
  }

  if (event.presale_end) {
    const end = new Date(event.presale_end);
    if (now > end) return false;
  }

  return true;
}

export function isItemAvailable(item: {
  active: boolean;
  available_from: string | null;
  available_until: string | null;
  require_voucher: boolean;
  hide_without_voucher: boolean;
}): boolean {
  if (!item.active) return false;
  if (item.hide_without_voucher) return false;

  const now = new Date();

  if (item.available_from) {
    const from = new Date(item.available_from);
    if (now < from) return false;
  }

  if (item.available_until) {
    const until = new Date(item.available_until);
    if (now > until) return false;
  }

  return true;
}
