import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, ShoppingCart } from 'lucide-react';
import { pretixClient } from '../../lib/api/pretix-client';
import { useCart } from '../../lib/hooks/useCart';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  PageLoading,
  Alert,
  Badge,
} from '../../components/ui';
import { formatPrice, formatDateShort, getLocalizedString, isItemAvailable } from '../../lib/utils/format';
import type { PretixEvent, PretixItem, PretixCategory } from '../../types/pretix';

export function EventDetail() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [event, setEvent] = useState<PretixEvent | null>(null);
  const [items, setItems] = useState<PretixItem[]>([]);
  const [categories, setCategories] = useState<PretixCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<number, { variationId: number | null; quantity: number }>>({});

  useEffect(() => {
    loadEventData();
  }, []);

  const loadEventData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [eventData, itemsData, categoriesData] = await Promise.all([
        pretixClient.getEvent(),
        pretixClient.getItems(),
        pretixClient.getCategories(),
      ]);

      setEvent(eventData);
      setItems(itemsData.results);
      setCategories(categoriesData.results);
    } catch (err) {
      setError(t('errors.generic'));
      console.error('Failed to load event data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: PretixItem, variationId: number | null = null) => {
    const variation = variationId
      ? item.variations.find((v) => v.id === variationId)
      : null;

    const price = variation?.price || item.default_price || '0';

    addItem({
      item: item.id,
      variation: variationId,
      price,
      attendee_name: null,
      attendee_email: null,
      voucher: null,
      addon_to: null,
      subevent: null,
      answers: [],
      seat: null,
      itemDetails: item,
      variationDetails: variation || undefined,
    });

    navigate('/cart');
  };

  if (loading) {
    return <PageLoading text={t('app.loading')} />;
  }

  if (error || !event) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="error" title={t('app.error')}>
          {error || t('errors.notFound')}
        </Alert>
        <Button onClick={() => navigate('/')} className="mt-4" variant="ghost">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('eventDetail.backToEvents')}
        </Button>
      </div>
    );
  }

  const eventName = getLocalizedString(event.name, i18n.language);
  const eventLocation = getLocalizedString(event.location, i18n.language);
  const availableItems = items.filter(isItemAvailable);

  const itemsByCategory = categories.reduce((acc, category) => {
    const categoryItems = availableItems.filter((item) => item.category === category.id);
    if (categoryItems.length > 0) {
      acc[category.id] = { category, items: categoryItems };
    }
    return acc;
  }, {} as Record<number, { category: PretixCategory; items: PretixItem[] }>);

  const uncategorizedItems = availableItems.filter((item) => !item.category);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Button onClick={() => navigate('/')} variant="ghost" className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('eventDetail.backToEvents')}
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary-dark mb-4">{eventName}</h1>
        <div className="flex flex-wrap gap-4 text-primary-dark">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-primary" />
            <span>
              {formatDateShort(event.date_from, i18n.language)}
              {event.date_to && ` - ${formatDateShort(event.date_to, i18n.language)}`}
            </span>
          </div>
          {eventLocation && (
            <div className="flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-primary" />
              <span>{eventLocation}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {Object.values(itemsByCategory).map(({ category, items: categoryItems }) => (
          <div key={category.id}>
            <h2 className="text-2xl font-bold text-primary-dark mb-4">
              {getLocalizedString(category.name, i18n.language)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  currency={event.currency}
                  locale={i18n.language}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </div>
        ))}

        {uncategorizedItems.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-primary-dark mb-4">{t('eventDetail.tickets')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uncategorizedItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  currency={event.currency}
                  locale={i18n.language}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  currency,
  locale,
  onAddToCart,
}: {
  item: PretixItem;
  currency: string;
  locale: string;
  onAddToCart: (item: PretixItem, variationId: number | null) => void;
}) {
  const { t } = useTranslation();
  const [selectedVariation, setSelectedVariation] = useState<number | null>(
    item.has_variations && item.variations.length > 0 ? item.variations[0].id : null
  );

  const itemName = getLocalizedString(item.name, locale);
  const itemDescription = getLocalizedString(item.description, locale);

  const displayPrice = selectedVariation
    ? item.variations.find((v) => v.id === selectedVariation)?.price
    : item.default_price;

  return (
    <Card variant="bordered">
      <CardHeader>
        <h3 className="text-lg font-semibold text-primary-dark">{itemName}</h3>
        {itemDescription && <p className="text-sm text-primary mt-1">{itemDescription}</p>}
      </CardHeader>
      <CardContent>
        {item.has_variations && item.variations.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              {item.variations.map((variation) => {
                const variationName = getLocalizedString(variation.value, locale);
                return (
                  <label
                    key={variation.id}
                    className="flex items-center justify-between p-3 border border-secondary/30 rounded-lg cursor-pointer hover:bg-secondary/10 hover:border-primary transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`variation-${item.id}`}
                        value={variation.id}
                        checked={selectedVariation === variation.id}
                        onChange={() => setSelectedVariation(variation.id)}
                        className="h-4 w-4 text-primary accent-primary"
                      />
                      <span className="font-medium text-primary-dark">{variationName}</span>
                    </div>
                    <span className="font-bold text-primary">
                      {formatPrice(variation.price, currency)}
                    </span>
                  </label>
                );
              })}
            </div>
            <Button
              onClick={() => onAddToCart(item, selectedVariation)}
              fullWidth
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {t('eventDetail.addToCart')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary-dark">{t('eventDetail.price')}</span>
              <span className="text-2xl font-bold text-primary">
                {formatPrice(displayPrice || '0', currency)}
              </span>
            </div>
            <Button onClick={() => onAddToCart(item, null)} fullWidth>
              <ShoppingCart className="h-4 w-4 mr-2" />
              {t('eventDetail.addToCart')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
