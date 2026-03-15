export interface PretixMultiLingualString {
  [locale: string]: string;
}

export interface PretixEvent {
  name: PretixMultiLingualString;
  slug: string;
  live: boolean;
  testmode: boolean;
  currency: string;
  date_from: string;
  date_to: string | null;
  date_admission: string | null;
  is_public: boolean;
  presale_start: string | null;
  presale_end: string | null;
  location: PretixMultiLingualString | null;
  geo_lat: number | null;
  geo_lon: number | null;
  has_subevents: boolean;
  seating_plan: number | null;
  seat_category_mapping: Record<string, string>;
  meta_data: Record<string, string>;
}

export interface PretixItem {
  id: number;
  name: PretixMultiLingualString;
  internal_name: string | null;
  default_price: string | null;
  category: number | null;
  active: boolean;
  description: PretixMultiLingualString | null;
  free_price: boolean;
  tax_rate: string;
  tax_rule: number | null;
  admission: boolean;
  position: number;
  picture: string | null;
  available_from: string | null;
  available_until: string | null;
  require_voucher: boolean;
  hide_without_voucher: boolean;
  allow_cancel: boolean;
  min_per_order: number | null;
  max_per_order: number | null;
  checkin_attention: boolean;
  has_variations: boolean;
  variations: PretixItemVariation[];
  addons: PretixItemAddon[];
  bundles: PretixBundle[];
  meta_data: Record<string, string>;
}

export interface PretixItemVariation {
  id: number;
  value: PretixMultiLingualString;
  default_price: string | null;
  price: string;
  active: boolean;
  description: PretixMultiLingualString | null;
  position: number;
  require_approval: boolean;
  require_membership: boolean;
  sales_channels: string[];
  available_from: string | null;
  available_until: string | null;
  hide_without_voucher: boolean;
  meta_data: Record<string, string>;
}

export interface PretixItemAddon {
  addon_category: number;
  min_count: number;
  max_count: number;
  position: number;
  multi_allowed: boolean;
  price_included: boolean;
}

export interface PretixBundle {
  bundled_item: number;
  bundled_variation: number | null;
  count: number;
  designated_price: string;
}

export interface PretixCategory {
  id: number;
  name: PretixMultiLingualString;
  internal_name: string | null;
  description: PretixMultiLingualString | null;
  position: number;
  is_addon: boolean;
}

export interface PretixQuestion {
  id: number;
  question: PretixMultiLingualString;
  type: 'N' | 'S' | 'T' | 'B' | 'C' | 'M' | 'F' | 'D' | 'H' | 'W';
  required: boolean;
  items: number[];
  position: number;
  ask_during_checkin: boolean;
  identifier: string;
  help_text: PretixMultiLingualString | null;
  options: PretixQuestionOption[];
  dependency_question: number | null;
  dependency_values: string[];
  hidden: boolean;
  print_on_invoice: boolean;
}

export interface PretixQuestionOption {
  id: number;
  identifier: string;
  answer: PretixMultiLingualString;
  position: number;
}

export interface PretixQuota {
  id: number;
  name: string;
  size: number | null;
  items: number[];
  variations: number[];
  subevent: number | null;
  closed: boolean;
  close_when_sold_out: boolean;
  available: boolean;
  available_number: number | null;
}

export interface PretixVoucher {
  id: number;
  code: string;
  max_usages: number;
  redeemed: number;
  valid_until: string | null;
  block_quota: boolean;
  allow_ignore_quota: boolean;
  price_mode: 'none' | 'set' | 'subtract' | 'percent';
  value: string;
  item: number | null;
  variation: number | null;
  quota: number | null;
  tag: string;
  comment: string;
  seat: number | null;
  subevent: number | null;
}

export interface PretixCartPosition {
  id?: number;
  cart_id?: string;
  item: number;
  variation: number | null;
  price: string;
  attendee_name: string | null;
  attendee_email: string | null;
  voucher: string | null;
  addon_to: number | null;
  subevent: number | null;
  answers: PretixAnswer[];
  seat: string | null;
}

export interface PretixAnswer {
  question: number;
  answer: string;
  question_identifier: string;
  options: number[];
  option_identifiers: string[];
}

export interface PretixOrder {
  code: string;
  status: 'n' | 'p' | 'e' | 'c';
  testmode: boolean;
  secret: string;
  email: string | null;
  phone: string | null;
  locale: string;
  datetime: string;
  expires: string;
  payment_date: string | null;
  payment_provider: string;
  fees: PretixOrderFee[];
  total: string;
  comment: string;
  checkin_attention: boolean;
  invoice_address: PretixInvoiceAddress;
  positions: PretixOrderPosition[];
  downloads: PretixOrderDownload[];
  payments: PretixPayment[];
  refunds: PretixRefund[];
}

export interface PretixOrderPosition {
  id: number;
  order: string;
  positionid: number;
  item: number;
  variation: number | null;
  price: string;
  attendee_name: string | null;
  attendee_name_parts: Record<string, string>;
  attendee_email: string | null;
  voucher: number | null;
  tax_rate: string;
  tax_value: string;
  secret: string;
  addon_to: number | null;
  subevent: number | null;
  checkins: PretixCheckin[];
  answers: PretixAnswer[];
  downloads: PretixOrderDownload[];
  seat: PretixSeat | null;
  company: string | null;
  street: string | null;
  zipcode: string | null;
  city: string | null;
  country: string | null;
  state: string | null;
}

export interface PretixOrderFee {
  fee_type: 'payment' | 'shipping' | 'service' | 'cancellation' | 'other';
  value: string;
  description: string;
  internal_type: string;
  tax_rate: string;
  tax_value: string;
}

export interface PretixInvoiceAddress {
  is_business: boolean;
  company: string;
  name: string;
  name_parts: Record<string, string>;
  street: string;
  zipcode: string;
  city: string;
  country: string;
  state: string;
  vat_id: string;
  vat_id_validated: boolean;
  internal_reference: string;
}

export interface PretixOrderDownload {
  output: string;
  url: string;
}

export interface PretixPayment {
  local_id: number;
  state: 'pending' | 'confirmed' | 'canceled' | 'failed' | 'refunded';
  amount: string;
  created: string;
  payment_date: string | null;
  provider: string;
  details: Record<string, unknown>;
  payment_url: string | null;
}

export interface PretixRefund {
  local_id: number;
  state: 'created' | 'transit' | 'external' | 'done' | 'canceled' | 'failed';
  source: 'buyer' | 'admin';
  amount: string;
  created: string;
  execution_date: string | null;
  provider: string;
  payment: number;
  info: Record<string, unknown>;
}

export interface PretixCheckin {
  id: number;
  datetime: string;
  list: number;
  type: 'entry' | 'exit';
  gate: number | null;
  device: number | null;
}

export interface PretixSeat {
  id: number;
  name: string;
  seat_guid: string;
  seat_number: string;
  row_name: string;
  zone_name: string;
}

export interface PretixPaymentProvider {
  provider: string;
  name: PretixMultiLingualString;
  description: PretixMultiLingualString | null;
}

export interface PretixOrganizer {
  name: string;
  slug: string;
  public_url: string;
}

export interface CartItem extends PretixCartPosition {
  itemDetails?: PretixItem;
  variationDetails?: PretixItemVariation;
}

export type OrderStatus = 'pending' | 'paid' | 'expired' | 'canceled';
