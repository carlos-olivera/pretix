import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Calendar, TrendingDown } from 'lucide-react';
import { bnplClient } from '../../../lib/api/bnpl-client';
import { getPlanSummary, formatCurrency } from '../../../lib/utils/bnpl';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  PageLoading,
  Alert,
  Badge,
} from '../../../components/ui';
import type { BNPLPlan, BNPLCalculation } from '../../../types/bnpl';

interface BNPLPlanSelectorProps {
  ticketPrice: number;
  eventDate: string;
  onSelectPlan: (plan: BNPLPlan, calculation: BNPLCalculation) => void;
  onPayFullAmount: () => void;
}

export function BNPLPlanSelector({
  ticketPrice,
  eventDate,
  onSelectPlan,
  onPayFullAmount,
}: BNPLPlanSelectorProps) {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<BNPLPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [calculations, setCalculations] = useState<Record<string, BNPLCalculation>>({});

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);

      const availablePlans = await bnplClient.getAvailablePlans();
      setPlans(availablePlans);

      const calcs: Record<string, BNPLCalculation> = {};
      for (const plan of availablePlans) {
        const calculation = await bnplClient.calculateBNPL(plan.id, ticketPrice, eventDate);
        calcs[plan.id] = calculation;
      }
      setCalculations(calcs);

      if (availablePlans.length > 0) {
        setSelectedPlanId(availablePlans[0].id);
      }
    } catch (err) {
      setError('Failed to load payment plans');
      console.error('Plan loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selectedPlanId) return;

    const plan = plans.find(p => p.id === selectedPlanId);
    const calculation = calculations[selectedPlanId];

    if (plan && calculation) {
      onSelectPlan(plan, calculation);
    }
  };

  if (loading) {
    return <PageLoading text="Loading payment options..." />;
  }

  if (error || plans.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="error">
          {error || 'No BNPL plans available'}
        </Alert>
        <Button onClick={onPayFullAmount} className="mt-4" fullWidth>
          Pay Full Amount
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Payment Method</h1>
        <p className="text-gray-600">
          Select how you'd like to pay for your tickets. Split the cost into manageable installments or pay in full.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        {/* Pay Full Amount Option */}
        <Card
          variant="bordered"
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={onPayFullAmount}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-900">Pay Full Amount</h3>
                  <Badge variant="success">No Interest</Badge>
                </div>
                <p className="text-gray-600 mb-4">
                  Pay the total amount today and get instant ticket confirmation
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatCurrency(ticketPrice)}
                  </span>
                  <span className="text-gray-600">today</span>
                </div>
              </div>
              <Button variant="outline">Select</Button>
            </div>
          </CardContent>
        </Card>

        {/* BNPL Plans */}
        {plans.map((plan) => {
          const calculation = calculations[plan.id];
          if (!calculation) return null;

          const isSelected = selectedPlanId === plan.id;

          return (
            <Card
              key={plan.id}
              variant={isSelected ? 'elevated' : 'bordered'}
              className={`cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedPlanId(plan.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="h-6 w-6 text-blue-600" />
                      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                      {plan.slug === 'pay-in-4' && (
                        <Badge variant="info">Most Popular</Badge>
                      )}
                    </div>
                    <p className="text-gray-600 mb-4">{plan.description}</p>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">First Payment</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(calculation.upfront_amount)}
                        </p>
                        <p className="text-sm text-gray-600">due today</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Remaining Payments</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(calculation.installment_amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {calculation.number_of_installments - 1}x monthly
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <TrendingDown className="h-4 w-4" />
                      <span>No interest • No hidden fees</span>
                    </div>
                  </div>

                  <div className="ml-4">
                    <input
                      type="radio"
                      checked={isSelected}
                      onChange={() => setSelectedPlanId(plan.id)}
                      className="h-5 w-5 text-blue-600"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedPlanId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">How it works</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>Complete identity verification and accept payment terms</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>Pay your first installment to reserve your tickets</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Automatic payments on scheduled dates - or pay early anytime</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>Receive your tickets when payment is complete (before the event)</span>
            </li>
          </ul>
        </div>
      )}

      <Button
        onClick={handleContinue}
        fullWidth
        size="lg"
        disabled={!selectedPlanId}
      >
        Continue with {plans.find(p => p.id === selectedPlanId)?.name || 'Selected Plan'}
      </Button>
    </div>
  );
}
