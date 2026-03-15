import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../lib/hooks/useCart';
import { pretixClient } from '../../lib/api/pretix-client';
import { bnplService } from '../../lib/services/bnpl-service';
import { bnplClient } from '../../lib/api/bnpl-client';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Input,
  Select,
  PageLoading,
  Alert,
} from '../../components/ui';
import { formatPrice, getLocalizedString } from '../../lib/utils/format';
import type { PretixPaymentProvider } from '../../types/pretix';
import type { BNPLEligibility, BNPLPlan } from '../../types/bnpl';

export function Checkout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { cart, getTotal, clearCart } = useCart();

  const [paymentProviders, setPaymentProviders] = useState<PretixPaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [useBNPL, setUseBNPL] = useState(false);
  const [bnplEligibility, setBnplEligibility] = useState<BNPLEligibility | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    name: '',
    street: '',
    zipCode: '',
    city: '',
    country: '',
    paymentProvider: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (cart.items.length === 0) {
      navigate('/cart');
      return;
    }
    loadPaymentProviders();
  }, []);

  const loadPaymentProviders = async () => {
    try {
      setLoading(true);
      const response = await pretixClient.getPaymentProviders();
      setPaymentProviders(response.results);
      if (response.results.length > 0) {
        setFormData((prev) => ({
          ...prev,
          paymentProvider: response.results[0].provider,
        }));
      }
    } catch (err) {
      setError(t('errors.generic'));
      console.error('Failed to load payment providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = t('checkout.required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('errors.invalidData');
    }

    if (!formData.name) {
      errors.name = t('checkout.required');
    }

    if (!formData.paymentProvider) {
      errors.paymentProvider = t('checkout.required');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const order = await pretixClient.createOrder('', {
        email: formData.email,
        locale: i18n.language,
        payment_provider: formData.paymentProvider,
        invoice_address: {
          name: formData.name,
          street: formData.street,
          zipcode: formData.zipCode,
          city: formData.city,
          country: formData.country,
        },
        positions: cart.items.map((item) => ({
          item: item.item,
          variation: item.variation,
          price: item.price,
          answers: item.answers,
        })),
      });

      clearCart();
      navigate(`/order/${order.code}?secret=${order.secret}`);
    } catch (err) {
      setError(t('errors.generic'));
      console.error('Failed to create order:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoading text={t('app.loading')} />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('checkout.title')}</h1>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card variant="bordered">
              <CardHeader>
                <h2 className="text-xl font-bold text-gray-900">
                  {t('checkout.contactInformation')}
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label={t('checkout.email')}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  error={formErrors.email}
                  required
                />
                <Input
                  label={t('checkout.phone')}
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </CardContent>
            </Card>

            <Card variant="bordered">
              <CardHeader>
                <h2 className="text-xl font-bold text-gray-900">
                  {t('checkout.invoiceAddress')}
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label={t('checkout.name')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  error={formErrors.name}
                  required
                />
                <Input
                  label={t('checkout.street')}
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={t('checkout.zipCode')}
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  />
                  <Input
                    label={t('checkout.city')}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <Input
                  label={t('checkout.country')}
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </CardContent>
            </Card>

            <Card variant="bordered">
              <CardHeader>
                <h2 className="text-xl font-bold text-gray-900">
                  {t('checkout.paymentMethod')}
                </h2>
              </CardHeader>
              <CardContent>
                {paymentProviders.length > 0 ? (
                  <Select
                    label={t('checkout.selectPaymentMethod')}
                    value={formData.paymentProvider}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentProvider: e.target.value })
                    }
                    options={paymentProviders.map((provider) => ({
                      value: provider.provider,
                      label: getLocalizedString(provider.name, i18n.language),
                    }))}
                    error={formErrors.paymentProvider}
                    required
                  />
                ) : (
                  <Alert variant="warning">{t('errors.generic')}</Alert>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card variant="bordered" className="sticky top-6">
              <CardHeader>
                <h2 className="text-xl font-bold text-gray-900">
                  {t('checkout.orderSummary')}
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {cart.items.map((item, index) => {
                    const itemName = item.itemDetails
                      ? getLocalizedString(item.itemDetails.name, i18n.language)
                      : `Item ${item.item}`;
                    return (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">{itemName}</span>
                        <span className="font-medium">{formatPrice(item.price, 'EUR')}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold text-gray-900">
                      {t('checkout.orderSummary')}
                    </span>
                    <span className="text-2xl font-bold text-gray-900">
                      {formatPrice(getTotal(), 'EUR')}
                    </span>
                  </div>
                  <Button type="submit" fullWidth size="lg" isLoading={submitting}>
                    {t('checkout.placeOrder')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
