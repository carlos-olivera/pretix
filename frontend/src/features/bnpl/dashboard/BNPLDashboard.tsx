import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, CreditCard, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { bnplClient } from '../../../lib/api/bnpl-client';
import {
  formatCurrency,
  formatDateShort,
  getAgreementStatusColor,
  getInstallmentStatusColor,
  calculatePaymentProgress,
  getNextInstallment,
  getDaysUntilDue,
} from '../../../lib/utils/bnpl';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  PageLoading,
  Alert,
  Badge,
} from '../../../components/ui';
import type { BNPLAgreement, BNPLDashboardStats } from '../../../types/bnpl';

interface BNPLDashboardProps {
  userId: string;
}

export function BNPLDashboard({ userId }: BNPLDashboardProps) {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<BNPLDashboardStats | null>(null);
  const [agreements, setAgreements] = useState<BNPLAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [userId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboardStats, userAgreements] = await Promise.all([
        bnplClient.getDashboardStats(userId),
        bnplClient.getUserAgreements(userId),
      ]);

      setStats(dashboardStats);
      setAgreements(userAgreements);
    } catch (err) {
      setError('Failed to load dashboard');
      console.error('Dashboard loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoading text="Loading your dashboard..." />;
  }

  if (error || !stats) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="error">{error || 'Unable to load dashboard'}</Alert>
        <Button onClick={loadDashboard} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My BNPL Payments</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card variant="bordered">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Financed</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.total_amount_financed)}
            </p>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Amount Paid</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.total_amount_paid)}
            </p>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Remaining</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.total_amount_remaining)}
            </p>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Overdue Payments</p>
            <p className="text-2xl font-bold text-red-600">
              {stats.overdue_count}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next Payment Due */}
      {stats.next_payment_due && (
        <Alert variant="info" className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Next Payment Due</h3>
              <p>
                {formatCurrency(stats.next_payment_due.amount)} due on{' '}
                {formatDateShort(stats.next_payment_due.due_date, i18n.language)}
                {' '}({getDaysUntilDue(stats.next_payment_due.due_date)} days)
              </p>
            </div>
            <Button size="sm">Pay Now</Button>
          </div>
        </Alert>
      )}

      {/* Active Agreements */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Payment Plans</h2>

        {agreements.length === 0 ? (
          <Card variant="bordered">
            <CardContent className="text-center py-12">
              <CreditCard className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg mb-4">No payment plans yet</p>
              <Button onClick={() => window.location.href = '/event'}>
                Browse Events
              </Button>
            </CardContent>
          </Card>
        ) : (
          agreements.map((agreement) => (
            <AgreementCard key={agreement.id} agreement={agreement} />
          ))
        )}
      </div>
    </div>
  );
}

function AgreementCard({ agreement }: { agreement: BNPLAgreement }) {
  const { i18n } = useTranslation();
  const progress = calculatePaymentProgress(agreement);
  const nextInstallment = agreement.installments
    ? getNextInstallment(agreement.installments)
    : null;

  return (
    <Card variant="bordered">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Agreement #{agreement.agreement_number}
            </h3>
            <p className="text-sm text-gray-600">
              Event: {formatDateShort(agreement.event_date, i18n.language)}
            </p>
          </div>
          <Badge variant={getAgreementStatusColor(agreement.status) as any}>
            {agreement.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Payment Progress</span>
              <span className="font-medium">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Amount</p>
              <p className="font-bold text-gray-900">
                {formatCurrency(agreement.total_amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Paid</p>
              <p className="font-bold text-green-600">
                {formatCurrency(agreement.total_amount - agreement.remaining_amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Remaining</p>
              <p className="font-bold text-orange-600">
                {formatCurrency(agreement.remaining_amount)}
              </p>
            </div>
          </div>

          {/* Next Payment */}
          {nextInstallment && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Next Payment
                  </p>
                  <p className="text-lg font-bold text-blue-900">
                    {formatCurrency(nextInstallment.amount)}
                  </p>
                  <p className="text-sm text-blue-700">
                    Due {formatDateShort(nextInstallment.due_date, i18n.language)}
                  </p>
                </div>
                <Button size="sm">Pay Now</Button>
              </div>
            </div>
          )}

          {/* Installment List */}
          {agreement.installments && agreement.installments.length > 0 && (
            <div className="pt-4">
              <h4 className="font-semibold text-gray-900 mb-3">Installments</h4>
              <div className="space-y-2">
                {agreement.installments.map((installment) => (
                  <div
                    key={installment.id}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600">
                        #{installment.installment_number}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(installment.amount)}
                      </span>
                      <span className="text-sm text-gray-600">
                        {formatDateShort(installment.due_date, i18n.language)}
                      </span>
                    </div>
                    <Badge variant={getInstallmentStatusColor(installment.status) as any}>
                      {installment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
