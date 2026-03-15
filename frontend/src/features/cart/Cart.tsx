import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, ArrowLeft } from 'lucide-react';
import { useCart } from '../../lib/hooks/useCart';
import { Card, CardContent, CardHeader, Button, Alert } from '../../components/ui';
import { formatPrice, getLocalizedString } from '../../lib/utils/format';

export function Cart() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { cart, removeItem, getTotal, getItemCount } = useCart();

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-primary-dark mb-8">{t('cart.title')}</h1>
        <Card variant="bordered">
          <CardContent className="text-center py-12">
            <ShoppingCart className="h-16 w-16 mx-auto text-secondary mb-4" />
            <p className="text-primary-dark text-lg mb-6">{t('cart.empty')}</p>
            <Button onClick={() => navigate('/event')}>
              {t('cart.continueShopping')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Button onClick={() => navigate('/event')} variant="ghost" className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('cart.continueShopping')}
      </Button>

      <h1 className="text-3xl font-bold text-primary-dark mb-8">{t('cart.title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => {
            const itemName = item.itemDetails
              ? getLocalizedString(item.itemDetails.name, i18n.language)
              : `Item ${item.item}`;
            const variationName = item.variationDetails
              ? getLocalizedString(item.variationDetails.value, i18n.language)
              : null;

            return (
              <Card key={item.id} variant="bordered">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-primary-dark">{itemName}</h3>
                      {variationName && (
                        <p className="text-sm text-primary mt-1">{variationName}</p>
                      )}
                      <p className="text-lg font-bold text-primary mt-2">
                        {formatPrice(item.price, 'EUR')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => item.id && removeItem(item.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="lg:col-span-1">
          <Card variant="bordered" className="sticky top-6">
            <CardHeader>
              <h2 className="text-xl font-bold text-primary-dark">{t('cart.total')}</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-primary-dark">{t('cart.subtotal')}</span>
                <span className="font-medium text-primary-dark">{formatPrice(getTotal(), 'EUR')}</span>
              </div>

              <div className="border-t border-secondary/20 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-bold text-primary-dark">{t('cart.total')}</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(getTotal(), 'EUR')}
                  </span>
                </div>
                <Button onClick={handleCheckout} fullWidth size="lg">
                  {t('cart.proceedToCheckout')}
                </Button>
              </div>

              <p className="text-xs text-primary text-center">
                {getItemCount()} {getItemCount() === 1 ? t('cart.item') : t('cart.item')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
