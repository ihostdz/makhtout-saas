import { useLocation, useNavigate, Link } from 'react-router';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import type { Order } from '@/types';

export function SuccessPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const orderId: string | undefined = location.state?.orderId;

  const orders = JSON.parse(localStorage.getItem('topup-orders') || '[]') as Order[];
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-slate-400">Commande introuvable.</p>
        <Button onClick={() => navigate('/')} className="mt-4">{t('nav.home')}</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-16 text-center">
      <div className="mb-6 flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle className="h-10 w-10 text-emerald-400" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-white mb-3">{t('success.title')}</h1>
      <p className="text-slate-400 mb-2">{t('success.message')}</p>
      {order.email && (
        <p className="text-sm text-slate-500 mb-6 flex items-center justify-center gap-1">
          <Mail className="h-4 w-4" />
          {t('success.emailSent')} <span className="text-violet-400">{order.email}</span>
        </p>
      )}

      <Card className="border-white/10 bg-white/5 text-left mb-8">
        <CardContent className="p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">{t('success.orderId')}</span>
            <span className="font-mono font-medium text-white">{order.id}</span>
          </div>
          {order.paypalRef && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Réf. paiement</span>
              <span className="font-mono font-medium text-white">{order.paypalRef}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">{t('success.status')}</span>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">{t('dashboard.status.paid')}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">{t('payment.number')}</span>
            <span className="font-medium text-white">{order.phoneNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">{t('payment.amount')}</span>
            <span className="font-medium text-white">{order.amount} DZD</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/order">
          <Button className="h-12 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-bold">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('success.newOrder')}
          </Button>
        </Link>
        <Link to="/dashboard">
          <Button variant="outline" className="h-12 px-6 rounded-xl border-white/10 text-white hover:bg-white/5">
            {t('nav.dashboard')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
