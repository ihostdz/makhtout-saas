import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { operators, getFraudAlerts } from '@/data/operators';
import type { Order, FraudAlert } from '@/types';
import {
  ShoppingCart, Euro, TrendingUp, Clock, CheckCircle2,
  XCircle, RefreshCw, Package, ShieldAlert, ShieldCheck, AlertTriangle
} from 'lucide-react';

export function DashboardPage() {
  const { t } = useI18n();
  const [refreshTick, setRefreshTick] = useState(0);

  const orders = useMemo(() => {
    return JSON.parse(localStorage.getItem('topup-orders') || '[]') as Order[];
  }, [refreshTick]);

  const alerts = useMemo(() => {
    return getFraudAlerts() as FraudAlert[];
  }, [refreshTick]);

  const stats = useMemo(() => {
    const total = orders.length;
    const revenue = orders
      .filter((o) => o.status === 'completed' || o.status === 'paid' || o.status === 'processing')
      .reduce((sum, o) => sum + o.priceEur, 0);
    const completed = orders.filter((o) => o.status === 'completed').length;
    const pending = orders.filter((o) => o.status === 'pending' || o.status === 'paid').length;
    const failed = orders.filter((o) => o.status === 'failed').length;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const avgFraudScore = orders.length > 0
      ? Math.round((orders.reduce((s, o) => s + (o.fraudScore || 0), 0) / orders.length) * 10) / 10
      : 0;
    return { total, revenue, completed, pending, failed, successRate, avgFraudScore };
  }, [orders]);

  const updateStatus = (id: string, status: Order['status']) => {
    const all = JSON.parse(localStorage.getItem('topup-orders') || '[]') as Order[];
    const updated = all.map((o) =>
      o.id === id
        ? { ...o, status, completedAt: status === 'completed' ? new Date().toISOString() : o.completedAt }
        : o
    );
    localStorage.setItem('topup-orders', JSON.stringify(updated));
    setRefreshTick((v) => v + 1);
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    paid: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const statusLabels: Record<string, string> = {
    pending: t('dashboard.status.pending'),
    paid: t('dashboard.status.paid'),
    processing: t('dashboard.status.processing'),
    completed: t('dashboard.status.completed'),
    failed: t('dashboard.status.failed'),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 space-y-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-white">{t('dashboard.title')}</h1>
        <Button variant="outline" size="sm" onClick={() => setRefreshTick((v) => v + 1)} className="border-white/10 text-white hover:bg-white/5">
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                <ShoppingCart className="h-4 w-4 text-violet-400" />
              </div>
              <span className="text-xs text-slate-500">{t('dashboard.totalOrders')}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <Euro className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-xs text-slate-500">{t('dashboard.revenue')}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.revenue.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <TrendingUp className="h-4 w-4 text-blue-400" />
              </div>
              <span className="text-xs text-slate-500">{t('dashboard.successRate')}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.successRate}%</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <span className="text-xs text-slate-500">{t('dashboard.pending')}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.pending}</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Health Bar */}
      <Card className={`border ${stats.avgFraudScore > 30 ? 'border-red-500/20 bg-red-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {stats.avgFraudScore > 30 ? (
              <ShieldAlert className="h-6 w-6 text-red-400" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            )}
            <div>
              <p className="text-sm font-semibold text-white">
                {stats.avgFraudScore > 30 ? 'Alertes de sécurité détectées' : 'Sécurité — tout va bien'}
              </p>
              <p className="text-xs text-slate-500">
                Score moyen de fraude : {stats.avgFraudScore}/100 • {alerts.length} alerte(s) • {stats.failed} échec(s)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {stats.avgFraudScore > 30 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" /> Risque élevé
              </Badge>
            )}
            {stats.avgFraudScore <= 15 && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <ShieldCheck className="h-3 w-3 mr-1" /> Sécurisé
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fraud Alerts */}
      {alerts.length > 0 && (
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-400" />
              Alertes de fraude ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500">
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Numéro</th>
                    <th className="px-4 py-3 text-left font-medium">Score</th>
                    <th className="px-4 py-3 text-left font-medium">Raison</th>
                    <th className="px-4 py-3 text-left font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.slice(0, 20).map((alert) => (
                    <tr key={alert.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-slate-400">{new Date(alert.timestamp).toLocaleString()}</td>
                      <td className="px-4 py-3 text-white">{alert.email}</td>
                      <td className="px-4 py-3 text-white font-mono">{alert.phone}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${
                          alert.score >= 50 ? 'bg-red-500/20 text-red-400' :
                          alert.score >= 25 ? 'bg-amber-500/20 text-amber-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {alert.score}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">{alert.reasons.join(', ')}</td>
                      <td className="px-4 py-3">
                        {alert.blocked ? (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Bloqué</Badge>
                        ) : (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Suspicion</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-violet-400" />
            {t('dashboard.recentOrders')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="p-10 text-center text-slate-500">{t('dashboard.noOrders')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500">
                    <th className="px-4 py-3 text-left font-medium">{t('dashboard.date')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('dashboard.operator')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('dashboard.number')}</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">{t('dashboard.amount')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('dashboard.price')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('dashboard.status')}</th>
                    <th className="px-4 py-3 text-right font-medium">{t('dashboard.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const op = operators.find((o) => o.id === order.operatorId);
                    return (
                      <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {op && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: op.color }} />}
                            <span className="text-white font-medium">{op?.name ?? order.operatorId}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white font-mono">{order.phoneNumber}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{order.email}</td>
                        <td className="px-4 py-3 text-white">{order.amount} DZD</td>
                        <td className="px-4 py-3 text-white font-semibold">{order.priceEur.toFixed(2)} €</td>
                        <td className="px-4 py-3">
                          <Badge className={`${statusColors[order.status]} text-xs`}>
                            {statusLabels[order.status] ?? order.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {order.status === 'paid' && (
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" onClick={() => updateStatus(order.id, 'completed')} className="h-7 bg-emerald-600 hover:bg-emerald-500 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />{t('dashboard.markComplete')}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, 'failed')} className="h-7 border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs">
                                <XCircle className="h-3 w-3 mr-1" />{t('dashboard.markFailed')}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
