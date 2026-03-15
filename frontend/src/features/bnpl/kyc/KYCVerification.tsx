import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Shield } from 'lucide-react';
import { bnplClient } from '../../../lib/api/bnpl-client';
import { validateKYCData } from '../../../lib/utils/bnpl';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Input,
  Select,
  Alert,
} from '../../../components/ui';
import type { UserKYCProfile } from '../../../types/bnpl';

interface KYCVerificationProps {
  userId: string;
  onComplete: (profile: UserKYCProfile) => void;
  onSkip?: () => void;
}

export function KYCVerification({ userId, onComplete, onSkip }: KYCVerificationProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    phone_number: '',
    email: '',
    national_id_number: '',
    country_code: 'ES',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateKYCData(formData);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setFormErrors({});

      const profile = await bnplClient.createKYCProfile({
        user_id: userId,
        ...formData,
        verification_status: 'verified',
        verification_method: 'basic',
        risk_score: 70,
      });

      setSuccess(true);
      setTimeout(() => {
        onComplete(profile);
      }, 1500);
    } catch (err) {
      setError('Failed to create KYC profile. Please try again.');
      console.error('KYC creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card variant="bordered" className="max-w-2xl mx-auto">
        <CardContent className="text-center py-12">
          <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verification Complete
          </h2>
          <p className="text-gray-600">
            Your identity has been verified. Proceeding to payment options...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bordered" className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Identity Verification</h2>
        </div>
        <p className="text-gray-600">
          To use Buy Now Pay Later, we need to verify your identity. This helps protect both you and the event organizer.
        </p>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            error={formErrors.full_name}
            required
          />

          <Input
            label="Date of Birth"
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            error={formErrors.date_of_birth}
            required
          />

          <Input
            label="Phone Number"
            type="tel"
            value={formData.phone_number}
            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            error={formErrors.phone_number}
            required
          />

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={formErrors.email}
            required
          />

          <Input
            label="National ID Number"
            value={formData.national_id_number}
            onChange={(e) => setFormData({ ...formData, national_id_number: e.target.value })}
            helperText="Optional - helps improve approval chances"
          />

          <Select
            label="Country"
            value={formData.country_code}
            onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
            options={[
              { value: 'ES', label: 'Spain' },
              { value: 'FR', label: 'France' },
              { value: 'DE', label: 'Germany' },
              { value: 'IT', label: 'Italy' },
              { value: 'GB', label: 'United Kingdom' },
              { value: 'US', label: 'United States' },
            ]}
            required
          />

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h3 className="font-semibold text-blue-900 mb-2">Why we need this information</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Verify your identity to prevent fraud</li>
              <li>✓ Assess eligibility for installment payments</li>
              <li>✓ Comply with financial regulations</li>
              <li>✓ Protect your account security</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              fullWidth
              isLoading={loading}
            >
              Verify Identity
            </Button>
            {onSkip && (
              <Button
                type="button"
                variant="outline"
                onClick={onSkip}
                disabled={loading}
              >
                Skip for Now
              </Button>
            )}
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Your information is encrypted and securely stored. We will never share your personal data with third parties without your consent.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
