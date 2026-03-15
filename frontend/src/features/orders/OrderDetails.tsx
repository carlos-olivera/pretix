import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, XCircle, CreditCard } from 'lucide-react';
import { pretixClient } from '../../lib/api/pretix-client';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  PageLoading,
  Alert,
  Badge,
} from '../../components/ui';
import { formatPrice, formatDate, getOrderStatusLabel } from '../../lib/utils/format';
import type { PretixOrder } from '../../types/pretix';

export function OrderDetails() {
  const { t, i18n } = useTranslation();
  const { orderCode } = useParams<{ orderCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const secret = searchParams.get('secret');

  const [order, setOrder] = useState<PretixOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (orderCode && secret) {
      loadOrder();
    } else {
      setError(t('order.orderNotFound'));
      setLoading(false);
    }
  }, [orderCode, secret]);

  const loadOrder = async () => {
    if (!orderCode || !secret) return;

    try {
      setLoading(true);
      setError(null);
      const orderData = await pretixClient.getOrder(orderCode, secret);
      setOrder(orderData);
    } catch (err) {
      setError(t('order.orderNotFound'));
      console.error('Failed to load order:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (!order || !secret) return;

    try {
      setProcessingPayment(true);
      const result = await pretixClient.initiatePayment(
        order.code,
        secret,
        order.payment_provider
      );

      if (result.payment_url) {
        window.location.href = result.payment_url;
      } else {
        await loadOrder();
      }
    } catch (err) {
      setError(t('payment.failed'));
      console.error('Failed to initiate payment:', err);
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return <PageLoading text={t('app.loading')} />;
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="error" title={t('app.error')}>
          {error || t('order.orderNotFound')}
        </Alert>
        <Button onClick={() => navigate('/')} className="mt-4">
          {t('order.backToEvents')}
        </Button>
      </div>
    );
  }

  const statusConfig = {
    n: { icon: Clock, color: 'warning', label: t('order.pending') },
    p: { icon: CheckCircle, color: 'success', label: t('order.paid') },
    e: { icon: XCircle, color: 'danger', label: t('order.expired') },
    c: { icon: XCircle, color: 'default', label: t('order.canceled') },
  } as const;

  const status = statusConfig[order.status] || statusConfig.n;
  const StatusIcon = status.icon;
  const isPending = order.status === 'n';

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <StatusIcon className={`h-16 w-16 text-${status.color}-500`} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {order.status === 'p' ? t('order.thankYou') : t('order.title')}
        </h1>
        {order.status === 'p' && order.email && (
          <p className="text-gray-600">
            {t('order.confirmationEmailSent')} {order.email}
          </p>
        )}
      </div>

      <div className="space-y-6">
        <Card variant="bordered">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('order.orderDetails')}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {t('order.orderNumber')}: <span className="font-mono">{order.code}</span>
                </p>
              </div>
              <Badge variant={status.color as any}>{status.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">{t('order.status')}:</span>
                <span className="ml-2 font-medium">{status.label}</span>
              </div>
              <div>
                <span className="text-gray-600">{t('common.date')}:</span>
                <span className="ml-2 font-medium">
                  {formatDate(order.datetime, i18n.language)}
                </span>
              </div>
              {order.email && (
                <div className="col-span-2">
                  <span className="text-gray-600">{t('common.email')}:</span>
                  <span className="ml-2 font-medium">{order.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardHeader>
            <h2 className="text-xl font-bold text-gray-900">{t('order.items')}</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.positions.map((position, index) => (
                <div key={index} className="flex justify-between items-start pb-4 border-b last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">
                      Position #{position.positionid}
                    </p>
                    {position.attendee_name && (
                      <p className="text-sm text-gray-600">{position.attendee_name}</p>
                    )}
                  </div>
                  <p className="font-bold text-gray-900">
                    {formatPrice(position.price, 'EUR')}
                  </p>
                </div>
              ))}

              {order.fees.map((fee, index) => (
                <div key={index} className="flex justify-between items-start pb-4 border-b last:border-b-0">
                  <p className="text-sm text-gray-600">{fee.description}</p>
                  <p className="font-medium text-gray-900">
                    {formatPrice(fee.value, 'EUR')}
                  </p>
                </div>
              ))}

              <div className="flex justify-between items-center pt-4">
                <p className="text-lg font-bold text-gray-900">{t('cart.total')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice(order.total, 'EUR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isPending && (
          <Card variant="bordered">
            <CardHeader>
              <h2 className="text-xl font-bold text-gray-900">
                {t('order.paymentInformation')}
              </h2>
            </CardHeader>
            <CardContent>
              <Alert variant="warning" className="mb-4">
                {t('payment.pending')}
              </Alert>
              <Button
                onClick={handlePayNow}
                isLoading={processingPayment}
                fullWidth
                size="lg"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                {t('order.payNow')}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Button onClick={() => navigate('/')} variant="outline">
            {t('order.backToEvents')}
          </Button>
        </div>
      </div>
    </div>
  );
}
