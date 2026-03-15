import type { BNPLAgreement, InstallmentSchedule, BNPLPlan } from '../../types/bnpl';

export function getAgreementStatusColor(status: BNPLAgreement['status']): string {
  const colors = {
    pending: 'warning',
    active: 'info',
    completed: 'success',
    cancelled: 'default',
    defaulted: 'danger',
  };
  return colors[status] || 'default';
}

export function getInstallmentStatusColor(status: InstallmentSchedule['status']): string {
  const colors = {
    pending: 'warning',
    paid: 'success',
    overdue: 'danger',
    cancelled: 'default',
    refunded: 'info',
  };
  return colors[status] || 'default';
}

export function getReservationStatusColor(status: string): string {
  const colors = {
    reserved: 'warning',
    released: 'success',
    cancelled: 'danger',
    confirmed: 'success',
    expired: 'default',
  };
  return colors[status] || 'default';
}

export function calculatePaymentProgress(agreement: BNPLAgreement): number {
  const paid = agreement.total_amount - agreement.remaining_amount;
  return (paid / agreement.total_amount) * 100;
}

export function getNextInstallment(installments: InstallmentSchedule[]): InstallmentSchedule | null {
  const pending = installments
    .filter(i => i.status === 'pending')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  return pending.length > 0 ? pending[0] : null;
}

export function isInstallmentOverdue(installment: InstallmentSchedule): boolean {
  if (installment.status !== 'pending') return false;
  const today = new Date();
  const dueDate = new Date(installment.due_date);
  return dueDate < today;
}

export function getDaysUntilDue(dueDate: string): number {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function getDaysOverdue(dueDate: string): number {
  return Math.abs(getDaysUntilDue(dueDate));
}

export function isInGracePeriod(installment: InstallmentSchedule): boolean {
  if (!installment.grace_period_ends_at) return false;
  const today = new Date();
  const gracePeriodEnd = new Date(installment.grace_period_ends_at);
  return today <= gracePeriodEnd;
}

export function canMakeEarlyPayment(agreement: BNPLAgreement): boolean {
  return agreement.status === 'active' && agreement.remaining_amount > 0;
}

export function shouldReleaseTicket(agreement: BNPLAgreement, thresholdPercentage: number): boolean {
  const progress = calculatePaymentProgress(agreement);
  return progress >= thresholdPercentage;
}

export function isEventApproaching(eventDate: string, daysThreshold: number = 7): boolean {
  const today = new Date();
  const event = new Date(eventDate);
  const diffTime = event.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= daysThreshold;
}

export function isFinalPaymentDeadlinePassed(deadline: string): boolean {
  const today = new Date();
  const deadlineDate = new Date(deadline);
  return today > deadlineDate;
}

export function calculateTotalPaid(installments: InstallmentSchedule[]): number {
  return installments
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.paid_amount, 0);
}

export function calculateTotalRemaining(installments: InstallmentSchedule[]): number {
  return installments
    .filter(i => i.status === 'pending' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.amount, 0);
}

export function getOverdueInstallments(installments: InstallmentSchedule[]): InstallmentSchedule[] {
  return installments.filter(i => i.status === 'overdue' || isInstallmentOverdue(i));
}

export function getPlanDisplayName(plan: BNPLPlan): string {
  return plan.name;
}

export function getPlanSummary(plan: BNPLPlan, ticketPrice: number): string {
  const upfrontAmount = (ticketPrice * plan.upfront_percentage) / 100;
  const remainingAmount = ticketPrice - upfrontAmount;
  const numberOfRemaining = plan.number_of_installments - 1;
  const installmentAmount = remainingAmount / numberOfRemaining;

  return `${formatCurrency(upfrontAmount)} today, then ${numberOfRemaining} payments of ${formatCurrency(installmentAmount)}`;
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatDateShort(dateString: string, locale: string = 'es'): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateLong(dateString: string, locale: string = 'es'): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function generatePaymentScheduleText(
  installments: Array<{ installment_number: number; amount: number; due_date: string }>,
  locale: string = 'es'
): string[] {
  return installments.map(i => {
    const date = formatDateShort(i.due_date, locale);
    const amount = formatCurrency(i.amount);
    return `Payment ${i.installment_number}: ${amount} - Due ${date}`;
  });
}

export function validateKYCData(data: {
  full_name: string;
  date_of_birth: string;
  phone_number: string;
  email: string;
  country_code: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!data.full_name || data.full_name.trim().length < 3) {
    errors.full_name = 'Full name must be at least 3 characters';
  }

  if (!data.date_of_birth) {
    errors.date_of_birth = 'Date of birth is required';
  } else {
    const dob = new Date(data.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    if (age < 18) {
      errors.date_of_birth = 'You must be at least 18 years old';
    }
  }

  if (!data.phone_number || data.phone_number.length < 10) {
    errors.phone_number = 'Valid phone number is required';
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Valid email is required';
  }

  if (!data.country_code || data.country_code.length !== 2) {
    errors.country_code = 'Valid country code is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function calculateRiskScore(factors: {
  activeBNPLCount: number;
  missedPaymentCount: number;
  totalBNPLValue: number;
  accountAge: number;
}): number {
  let score = 70;

  if (factors.activeBNPLCount > 3) {
    score -= 10;
  }

  score -= factors.missedPaymentCount * 15;

  if (factors.totalBNPLValue > 5000) {
    score -= 10;
  }

  if (factors.accountAge < 30) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}
