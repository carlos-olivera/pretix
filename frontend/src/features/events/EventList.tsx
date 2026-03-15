import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { pretixClient } from '../../lib/api/pretix-client';
import { Card, CardContent, Button, PageLoading, Alert, Badge } from '../../components/ui';
import { formatDateShort, getLocalizedString, isEventAvailable } from '../../lib/utils/format';
import type { PretixEvent } from '../../types/pretix';

export function EventList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [event, setEvent] = useState<PretixEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvent();
  }, []);

  const loadEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      const eventData = await pretixClient.getEvent();
      setEvent(eventData);
    } catch (err) {
      setError(t('errors.generic'));
      console.error('Failed to load event:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoading text={t('app.loading')} />;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="error" title={t('app.error')}>
          {error}
        </Alert>
        <Button onClick={loadEvent} className="mt-4">
          {t('app.retry')}
        </Button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="info">{t('events.noEvents')}</Alert>
      </div>
    );
  }

  const eventName = getLocalizedString(event.name, i18n.language);
  const eventLocation = getLocalizedString(event.location, i18n.language);
  const available = isEventAvailable(event);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-primary-dark mb-8">{t('events.title')}</h1>

      <Card variant="elevated" className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-primary-dark mb-2">{eventName}</h2>
                {event.testmode && (
                  <Badge variant="warning" className="mb-2">TEST MODE</Badge>
                )}
              </div>
              {!available && <Badge variant="danger">{t('events.soldOut')}</Badge>}
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center text-primary-dark">
                <Calendar className="h-5 w-5 mr-2 text-primary" />
                <span>
                  {formatDateShort(event.date_from, i18n.language)}
                  {event.date_to && ` - ${formatDateShort(event.date_to, i18n.language)}`}
                </span>
              </div>

              {eventLocation && (
                <div className="flex items-center text-primary-dark">
                  <MapPin className="h-5 w-5 mr-2 text-primary" />
                  <span>{eventLocation}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => navigate('/event')}
                disabled={!available}
                fullWidth
              >
                {available ? t('events.buyTickets') : t('events.soldOut')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
