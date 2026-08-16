import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { operators } from '@/data/operators';
import { Link } from 'react-router';
import {
  ArrowRight,
  Zap,
  Shield,
  Smartphone,
  Headphones,
  ChevronRight,
  Globe,
  CreditCard,
  Bitcoin,
  Clock,
  CheckCircle2,
  Phone,
  Wallet,
  Sparkles,
} from 'lucide-react';

export function LandingPage() {
  const { t } = useI18n();

  const features = [
    { icon: Zap, title: t('features.fast'), desc: t('features.fast.desc') },
    { icon: Shield, title: t('features.secure'), desc: t('features.secure.desc') },
    { icon: Smartphone, title: t('features.simple'), desc: t('features.simple.desc') },
    { icon: Headphones, title: t('features.support'), desc: t('features.support.desc') },
  ];

  const steps = [
    { icon: Globe, title: t('how.step1'), desc: t('how.step1.desc') },
    { icon: Phone, title: t('how.step2'), desc: t('how.step2.desc') },
    { icon: CreditCard, title: t('how.step3'), desc: t('how.step3.desc') },
    { icon: CheckCircle2, title: t('how.step4'), desc: t('how.step4.desc') },
  ];

  return (
    <div className="space-y-24 pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden pt-16 sm:pt-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/30 via-slate-950 to-slate-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-500/10 blur-[120px] rounded-full" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300 mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            {t('hero.trust')}
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
            {t('hero.title')}
          </h1>
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-slate-400 leading-relaxed mb-10">
            {t('hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/order">
              <Button className="h-14 px-8 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-base font-bold hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-500/25 transition-all">
                {t('hero.cta')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="outline" className="h-14 px-8 rounded-full border-white/10 text-white hover:bg-white/5">
                {t('nav.dashboard')}
              </Button>
            </Link>
          </div>

          {/* Payment badges */}
          <div className="mt-12 flex items-center justify-center gap-6 text-slate-500">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <span className="text-sm">PayPal</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Bitcoin className="h-5 w-5" />
              <span className="text-sm">Crypto</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="text-sm">&lt; 2 min</span>
            </div>
          </div>
        </div>
      </section>

      {/* Operators */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">{t('operators.title')}</h2>
          <p className="text-slate-400">{t('operators.desc')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {operators.map((op) => (
            <Card key={op.id} className="border-white/5 bg-white/[0.02] hover:border-white/10 transition-colors overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${op.bgGradient}`} />
              <CardContent className="p-6 text-center">
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl font-bold text-white shadow-lg ${op.bgGradient}`}>
                  {op.logoText[0]}
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{op.name}</h3>
                <p className="text-sm text-slate-500">Algérie</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">{t('how.title')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="relative group">
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-white/10 transition-colors">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
                  <step.icon className="h-6 w-6 text-violet-400" />
                </div>
                <div className="text-xs font-bold text-violet-400 mb-2">0{i + 1}</div>
                <h3 className="text-base font-semibold text-white mb-1">{step.title}</h3>
                <p className="text-sm text-slate-500">{step.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <ChevronRight className="h-5 w-5 text-white/10" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">{t('features.title')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="border-white/5 bg-white/[0.02] hover:border-white/10 transition-colors">
              <CardContent className="p-6 flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                  <f.icon className="h-6 w-6 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-900 to-fuchsia-900 p-10 sm:p-16 text-center">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative">
            <h2 className="text-3xl font-bold text-white mb-4">{t('hero.title')}</h2>
            <p className="text-violet-200 mb-8 max-w-lg mx-auto">{t('hero.subtitle')}</p>
            <Link to="/order">
              <Button className="h-14 px-8 rounded-full bg-white text-violet-900 font-bold hover:bg-white/90">
                <Wallet className="mr-2 h-5 w-5" />
                {t('hero.cta')}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
