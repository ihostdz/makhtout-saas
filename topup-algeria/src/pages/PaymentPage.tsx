import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { operators } from '@/data/operators';
import { ArrowLeft, CreditCard, Bitcoin, Wallet, Loader2, CheckCircle } from 'lucide-react';
import type { Order } from '@/types';

export function PaymentPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const order: Order | undefined = location.state?.order;

  const [processing, setProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-slate-400">Aucune commande trouvée.</p>
        <Button onClick={() => navigate('/order')} className="mt-4">{t('nav.recharge')}</Button>
      </div>
    );
  }

  const operator = operators.find((o) => o.id === order.operatorId);

  const getPaymentIcon = () => {
    if (order.paymentMethod === 'paypal') return <Wallet className="h-5 w-5 text-blue-400" />;
    if (order.paymentMethod === 'card') return <CreditCard className="h-5 w-5 text-indigo-400" />;
    return <Bitcoin className="h-5 w-5 text-amber-400" />;
  };

  const getPaymentLabel = () => {
    if (order.paymentMethod === 'paypal') return 'PayPal';
    if (order.paymentMethod === 'card') return t('payment.card');
    return t('payment.crypto');
  };

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      const orders = JSON.parse(localStorage.getItem('topup-orders') || '[]');
      const updated = orders.map((o: Order) =>
        o.id === order.id ? { ...o, status: 'paid' as const, paypalRef: 'PAY-' + Math.random().toString(36).slice(2, 10).toUpperCase() } : o
      );
      localStorage.setItem('topup-orders', JSON.stringify(updated));
      setProcessing(false);
      setConfirmed(true);
      setTimeout(() => navigate('/success', { state: { orderId: order.id } }), 800);
    }, 2000);
  };

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-10">
      <button onClick={() => navigate('/order')} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        {t('order.title')}
      </button>

      <h1 className="text-3xl font-bold text-white mb-6">{t('payment.title')}</h1>

      <Card className="border-white/10 bg-white/5 mb-6">
        <CardContent className="p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 mb-2">{t('payment.orderSummary')}</h3>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">{t('payment.operator')}</span>
            <span className="font-medium text-white flex items-center gap-2">
              {operator && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: operator.color }} />}
              {operator?.name ?? order.operatorId}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">{t('payment.number')}</span>
            <span className="font-medium text-white">{order.phoneNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Email</span>
            <span className="font-medium text-white">{order.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">{t('payment.amount')}</span>
            <span className="font-medium text-white">{order.amount} DZD</span>
          </div>
          <div className="border-t border-white/10 pt-3 flex justify-between">
            <span className="font-semibold text-white">{t('payment.total')}</span>
            <span className="text-xl font-bold text-white">{order.priceEur.toFixed(2)} €</span>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">{t('payment.method')}</h3>
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          {getPaymentIcon()}
          <div>
            <p className="text-sm font-semibold text-white">{getPaymentLabel()}</p>
            {order.paymentMethod === 'crypto' && <p className="text-xs text-slate-500">{t('payment.cryptoDiscount')}</p>}
            {order.paymentMethod === 'card' && <p className="text-xs text-slate-500">Visa / Mastercard</p>}
          </div>
          {order.paymentMethod === 'crypto' && (
            <Badge className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30">-5%</Badge>
          )}
        </div>
      </div>

      <Button
        onClick={handlePay}
        disabled={processing || confirmed}
        className="w-full h-14 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-base font-bold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
      >
        {processing ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('payment.processing')}</>
        ) : confirmed ? (
          <><CheckCircle className="mr-2 h-5 w-5 text-emerald-400" />Confirmé</>
        ) : (
          <><CreditCard className="mr-2 h-5 w-5" />{t('payment.confirm')}</>
        )}
      </Button>
    </div>
  );
}
