import { useMemo, useState, useEffect } from 'react';
import { useI18n } from '@/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { operators } from '@/data/operators';
import type { Order, VisitorStats, GeoStat } from '@/types';
import {
  Users, Eye, TrendingUp, ShoppingBag, Globe,
  RefreshCw, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

function generateDemoData(): { stats: VisitorStats[]; geo: GeoStat[] } {
  const stats: VisitorStats[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    stats.push({
      date: d.toISOString().split('T')[0],
      visitors: Math.floor(Math.random() * 50) + 10,
      pageViews: Math.floor(Math.random() * 120) + 30,
      orders: Math.floor(Math.random() * 8),
      revenue: Math.floor(Math.random() * 80) + 10,
    });
  }
  const geo: GeoStat[] = [
    { country: 'France', visitors: 342, orders: 28, flag: '🇫🇷' },
    { country: 'Canada', visitors: 156, orders: 12, flag: '🇨🇦' },
    { country: 'Belgique', visitors: 98, orders: 8, flag: '🇧🇪' },
    { country: 'États-Unis', visitors: 87, orders: 5, flag: '🇺🇸' },
    { country: 'Royaume-Uni', visitors: 64, orders: 4, flag: '🇬🇧' },
    { country: 'Allemagne', visitors: 45, orders: 3, flag: '🇩🇪' },
  ];
  return { stats, geo };
}

export function AnalyticsPage() {
  const { t } = useI18n();
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed' | 'pending'>('all');

  // Seed demo data if empty
  useEffect(() => {
    if (!localStorage.getItem('topup-stats')) {
      const { stats, geo } = generateDemoData();
      localStorage.setItem('topup-stats', JSON.stringify(stats));
      localStorage.setItem('topup-geo', JSON.stringify(geo));
    }
  }, []);

  const orders = useMemo(() => {
    return JSON.parse(localStorage.getItem('topup-orders') || '[]') as Order[];
  }, []);

  const stats = useMemo(() => {
    return JSON.parse(localStorage.getItem('topup-stats') || '[]') as VisitorStats[];
  }, []);

  const geo = useMemo(() => {
    return JSON.parse(localStorage.getItem('topup-geo') || '[]') as GeoStat[];
  }, []);

  const totalVisitors = stats.reduce((s, v) => s + (v.visitors || 0), 0);
  const totalPageViews = stats.reduce((s, v) => s + (v.pageViews || 0), 0);
  const totalOrders = stats.reduce((s, v) => s + (v.orders || 0), 0);
  const totalRevenue = stats.reduce((s, v) => s + (v.revenue || 0), 0);
  const conversionRate = totalVisitors > 0 ? ((totalOrders / totalVisitors) * 100).toFixed(1) : '0';
  const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0';

  const revenueByOperator = useMemo(() => {
    const map: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.status === 'completed' || o.status === 'paid') {
        map[o.operatorId] = (map[o.operatorId] || 0) + o.priceEur;
      }
    });
    return Object.entries(map).map(([id, value]) => {
      const op = operators.find((o) => o.id === id);
      return { name: op?.name ?? id, value: Math.round(value * 100) / 100, color: op?.color ?? '#888' };
    });
  }, [orders]);

  const ordersByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).map(([status, value]) => ({ name: status, value }));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'pending') return orders.filter((o) => o.status === 'pending' || o.status === 'paid');
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">{t('analytics.title')}</h1>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="border-white/10 text-white hover:bg-white/5">
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                <Users className="h-4 w-4 text-violet-400" />
              </div>
              <span className="text-xs text-slate-500">{t('analytics.visitors')}</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalVisitors}</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Eye className="h-4 w-4 text-blue-400" />
              </div>
              <span className="text-xs text-slate-500">{t('analytics.pageViews')}</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalPageViews}</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-xs text-slate-500">{t('analytics.conversionRate')}</span>
            </div>
            <p className="text-2xl font-bold text-white">{conversionRate}%</p>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-white/[0.02]">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <ShoppingBag className="h-4 w-4 text-amber-400" />
              </div>
              <span className="text-xs text-slate-500">{t('analytics.avgOrderValue')}</span>
            </div>
            <p className="text-2xl font-bold text-white">{avgOrderValue} €</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-base text-white">{t('analytics.dailyTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="visitors" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-base text-white">{t('analytics.revenueByOperator')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueByOperator}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '8px' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {revenueByOperator.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-base text-white">{t('analytics.ordersByStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={ordersByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {ordersByStatus.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {ordersByStatus.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  {statusLabels[entry.name] ?? entry.name} ({entry.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Globe className="h-4 w-4 text-violet-400" />
              {t('analytics.topCountries')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {geo.map((g) => (
                <div key={g.country} className="flex items-center gap-3">
                  <span className="text-lg">{g.flag}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white font-medium">{g.country}</span>
                      <span className="text-slate-400">{g.visitors} {t('analytics.visitorCount')}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${Math.min((g.visitors / (geo[0]?.visitors || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold">{g.orders}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full History */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg text-white">{t('analytics.history.title')}</CardTitle>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList className="bg-white/5">
                <TabsTrigger value="all" className="text-xs data-[state=active]:bg-white/10">{t('analytics.history.showAll')}</TabsTrigger>
                <TabsTrigger value="completed" className="text-xs data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3 mr-1" />{t('analytics.history.showCompleted')}
                </TabsTrigger>
                <TabsTrigger value="failed" className="text-xs data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                  <XCircle className="h-3 w-3 mr-1" />{t('analytics.history.showFailed')}
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                  <Clock className="h-3 w-3 mr-1" />{t('analytics.history.showPending')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="p-10 text-center text-slate-500">{t('dashboard.noOrders')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500">
                    <th className="px-4 py-3 text-left font-medium">{t('dashboard.date')}</th>
                    <th className="px-4 py-3 text-left font-medium">ID</th>
                    <th className="px-4 py-3 text-left font-medium">{t('dashboard.operator')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('dashboard.number')}</th>
                    <th className="px-4 py-3 text-left font-medium">Client</th>
                    <th className="px-4 py-3 text-left font-medium">{t('dashboard.amount')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('dashboard.price')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('dashboard.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const op = operators.find((o) => o.id === order.operatorId);
                    return (
                      <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{order.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {op && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: op.color }} />}
                            <span className="text-white font-medium">{op?.name ?? order.operatorId}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white font-mono">{order.phoneNumber}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{order.customerName || order.email || '-'}</td>
                        <td className="px-4 py-3 text-white">{order.amount} DZD</td>
                        <td className="px-4 py-3 text-white font-semibold">{order.priceEur.toFixed(2)} €</td>
                        <td className="px-4 py-3">
                          <Badge className={`${statusColors[order.status]} text-xs`}>
                            {statusLabels[order.status] ?? order.status}
                          </Badge>
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
