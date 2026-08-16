import { useNavigate } from 'react-router';
import { useI18n } from '@/i18n';
import { OrderForm } from '@/components/OrderForm';
import type { Order } from '@/types';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';

export function OrderPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleSubmit = (orderData: Omit<Order, 'id' | 'status' | 'createdAt'>) => {
    const order: Order = {
      ...orderData,
      id: 'ORD-' + Date.now().toString(36).toUpperCase(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const existing = JSON.parse(localStorage.getItem('topup-orders') || '[]');
    localStorage.setItem('topup-orders', JSON.stringify([order, ...existing]));

    const stats = JSON.parse(localStorage.getItem('topup-stats') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const idx = stats.findIndex((s: any) => s.date === today);
    if (idx >= 0) {
      stats[idx].orders = (stats[idx].orders || 0) + 1;
      stats[idx].revenue = (stats[idx].revenue || 0) + order.priceEur;
    }
    localStorage.setItem('topup-stats', JSON.stringify(stats));

    navigate('/payment', { state: { order } });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        {t('nav.home')}
      </Link>
      <h1 className="text-3xl font-bold text-white mb-2 text-center">{t('order.title')}</h1>
      <p className="text-slate-400 mb-8 text-center">{t('operators.desc')}</p>
      <OrderForm onSubmit={handleSubmit} />
    </div>
  );
}
