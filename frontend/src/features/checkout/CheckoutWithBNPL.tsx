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
  Badge,
} from '../../components/ui';
import { formatPrice, getLocalizedString } from '../../lib/utils/format';
import { CreditCard, Clock } from 'lucide-react';
import type { PretixPaymentProvider } from '../../types/pretix';
import type { BNPLEligibility, BNPLPlan } from '../../types/bnpl';

export function CheckoutWithBNPL() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { cart, getTotal, clearCart } = useCart();

  const [paymentProviders, setPaymentProviders] = useState<PretixPaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paymentMode, setPaymentMode] = useState<'full' | 'bnpl'>('full');
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

  const mockUserId = 'user-123'; // Replace with actual auth

  useEffect(() => {
    if (cart.items.length === 0) {
      navigate('/cart');
      return;
    }
    loadPaymentProviders();
    checkBNPLEligibility();
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

  const checkBNPLEligibility = async () => {
    if (cart.items.length === 0) return;

    try {
      setCheckingEligibility(true);
      const firstItem = cart.items[0];

      const eligibility = await bnplService.checkEligibility(
        mockUserId,
        firstItem.item,
        getTotal(),
        'prestaya-latam',
        'your-event-slug'
      );

      setBnplEligibility(eligibility);

      if (eligibility.eligible && eligibility.available_plans.length > 0) {
        setSelectedPlan(eligibility.available_plans[0].id);
      }
    } catch (err) {
      console.error('Failed to check BNPL eligibility:', err);
    } finally {
      setCheckingEligibility(false);
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

    if (paymentMode === 'full' && !formData.paymentProvider) {
      errors.paymentProvider = t('checkout.required');
    }

    if (paymentMode === 'bnpl' && !selectedPlan) {
      errors.plan = 'Please select a payment plan';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitFull = async () => {
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
  };

  const handleSubmitBNPL = async () => {
    if (!cart.items[0]) return;

    const firstItem = cart.items[0];
    const eventDate = new Date();
    eventDate.setMonth(eventDate.getMonth() + 3);

    const result = await bnplService.createAgreement(
      {
        user_id: mockUserId,
        plan_id: selectedPlan,
        pretix_organizer: 'prestaya-latam',
        pretix_event: 'your-event-slug',
        pretix_item_id: firstItem.item,
        pretix_variation_id: firstItem.variation || undefined,
        ticket_price: firstItem.price,
        event_date: eventDate.toISOString(),
        quantity: 1,
      }
    );

    if (result.success) {
      clearCart();
      navigate(`/bnpl/agreement/${result.agreement.id}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (paymentMode === 'full') {
        await handleSubmitFull();
      } else {
        await handleSubmitBNPL();
      }
    } catch (err) {
      setError(t('errors.generic'));
      console.error('Failed to process checkout:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateBNPLPayment = (plan: BNPLPlan): number => {
    const total = getTotal();
    return (total * plan.upfront_percentage) / 100;
  };

  if (loading) {
    return <PageLoading text={t('app.loading')} />;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-primary-dark mb-8">{t('checkout.title')}</h1>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Mode Selection */}
            <Card variant="bordered">
              <CardHeader>
                <h2 className="text-xl font-bold text-primary-dark">Choose Payment Method</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('full')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      paymentMode === 'full'
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-secondary/30 hover:border-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-6 h-6 text-primary" />
                      <div className="text-left">
                        <div className="font-semibold text-primary-dark">Pay in Full</div>
                        <div className="text-sm text-primary">
                          {formatPrice(getTotal(), 'EUR')}
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('bnpl')}
                    disabled={!bnplEligibility?.eligible}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      paymentMode === 'bnpl'
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-secondary/30 hover:border-secondary'
                    } ${!bnplEligibility?.eligible ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-6 h-6 text-primary" />
                      <div className="text-left">
                        <div className="font-semibold text-primary-dark flex items-center gap-2">
                          Pay in Installments
                          {bnplEligibility?.eligible && (
                            <Badge variant="success">
                              Available
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-primary">
                          {bnplEligibility?.eligible
                            ? 'Split your payment'
                            : 'Not available'}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>

                {!bnplEligibility?.eligible && bnplEligibility?.reasons && (
                  <Alert variant="info" className="mt-4">
                    <div className="text-sm">
                      <strong>BNPL not available:</strong>
                      <ul className="list-disc ml-5 mt-2">
                        {bnplEligibility.reasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* BNPL Plan Selection */}
            {paymentMode === 'bnpl' && bnplEligibility?.eligible && (
              <Card variant="bordered">
                <CardHeader>
                  <h2 className="text-xl font-bold text-primary-dark">Select Payment Plan</h2>
                </CardHeader>
                <CardContent className="space-y-3">
                  {bnplEligibility.available_plans.map((plan) => {
                    const upfrontAmount = calculateBNPLPayment(plan);
                    const installmentAmount =
                      (getTotal() - upfrontAmount) / (plan.number_of_installments - 1);

                    return (
                      <label
                        key={plan.id}
                        className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedPlan === plan.id
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-secondary/30 hover:border-secondary'
                        }`}
                      >
                        <input
                          type="radio"
                          name="bnpl-plan"
                          value={plan.id}
                          checked={selectedPlan === plan.id}
                          onChange={(e) => setSelectedPlan(e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-primary-dark">{plan.name}</div>
                            <div className="text-sm text-primary mt-1">
                              {plan.description}
                            </div>
                            <div className="text-sm text-primary-dark mt-2">
                              <strong>Today:</strong> {formatPrice(upfrontAmount, 'EUR')}
                            </div>
                            <div className="text-sm text-primary-dark">
                              <strong>Then:</strong> {plan.number_of_installments - 1} payments
                              of {formatPrice(installmentAmount, 'EUR')}
                            </div>
                          </div>
                          {selectedPlan === plan.id && (
                            <Badge variant="success">Selected</Badge>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            <Card variant="bordered">
              <CardHeader>
                <h2 className="text-xl font-bold text-primary-dark">
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

            {/* Invoice Address */}
            <Card variant="bordered">
              <CardHeader>
                <h2 className="text-xl font-bold text-primary-dark">
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

            {/* Payment Method (only for full payment) */}
            {paymentMode === 'full' && (
              <Card variant="bordered">
                <CardHeader>
                  <h2 className="text-xl font-bold text-primary-dark">
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
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card variant="bordered" className="sticky top-6">
              <CardHeader>
                <h2 className="text-xl font-bold text-primary-dark">
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
                        <span className="text-primary-dark">{itemName}</span>
                        <span className="font-medium text-primary-dark">{formatPrice(item.price, 'EUR')}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-secondary/20 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-bold text-primary-dark">Total</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(getTotal(), 'EUR')}
                    </span>
                  </div>

                  {paymentMode === 'bnpl' && selectedPlan && bnplEligibility?.available_plans && (
                    <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                      <div className="text-sm text-primary-dark">
                        <div className="font-semibold mb-1">Due Today:</div>
                        <div className="text-2xl font-bold text-primary">
                          {formatPrice(
                            calculateBNPLPayment(
                              bnplEligibility.available_plans.find((p) => p.id === selectedPlan)!
                            ),
                            'EUR'
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <Button type="submit" fullWidth size="lg" isLoading={submitting}>
                    {paymentMode === 'full'
                      ? t('checkout.placeOrder')
                      : 'Continue with BNPL'}
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
