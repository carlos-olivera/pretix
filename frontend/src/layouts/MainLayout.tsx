import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Ticket, Globe } from 'lucide-react';
import { useCart } from '../lib/hooks/useCart';
import { Button } from '../components/ui';

export function MainLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { getItemCount } = useCart();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="min-h-screen bg-[#F3E9D3]">
      <header className="bg-white border-b border-secondary/20 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 text-2xl font-bold text-primary-dark hover:text-primary transition-colors"
            >
              <Ticket className="h-7 w-7 text-primary" />
              <span className="bg-gradient-to-r from-primary-dark to-primary bg-clip-text text-transparent">
                TicketsYa
              </span>
            </button>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLanguage}
                className="flex items-center gap-2 text-primary-dark hover:text-primary hover:bg-secondary/10"
              >
                <Globe className="h-4 w-4" />
                {i18n.language.toUpperCase()}
              </Button>

              <button
                onClick={() => navigate('/cart')}
                className="relative flex items-center gap-2 px-4 py-2 text-primary-dark hover:text-primary transition-colors hover:bg-secondary/10 rounded-lg"
              >
                <ShoppingCart className="h-5 w-5" />
                {getItemCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                    {getItemCount()}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100vh-200px)]">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-secondary/20 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center text-primary-dark text-sm">
            <p className="font-medium">{new Date().getFullYear()} TicketsYa - {t('app.title')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
