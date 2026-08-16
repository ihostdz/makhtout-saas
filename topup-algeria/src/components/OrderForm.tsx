import { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/i18n';
import { operators, priceTiers, cryptoDiscountPercent, detectOperatorByPrefix, checkFraud } from '@/data/operators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, Phone, ArrowRight, Tag, Mail, Shield, ShieldAlert, Timer, Wallet, CreditCard, Bitcoin } from 'lucide-react';
import type { Order } from '@/types';

interface OrderFormProps {
  onSubmit: (order: Omit<Order, 'id' | 'status' | 'createdAt'>) => void;
}

export function OrderForm({ onSubmit }: OrderFormProps) {
  const { t } = useI18n();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [amountDzd, setAmountDzd] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'card' | 'crypto'>('paypal');
  const [error, setError] = useState('');
  const [manualOperator, setManualOperator] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  
  // Anti-spam honeypot — invisible field
  const [honeypot, setHoneypot] = useState('');
  const honeypotRef = useRef<HTMLInputElement>(null);
  
  // Fraud detection state
  const [fraudResult, setFraudResult] = useState<ReturnType<typeof checkFraud> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const detected = detectOperatorByPrefix(phone);
  const operatorId = manualOperator ?? detected?.id ?? '';
  const selectedOperator = operators.find((o) => o.id === operatorId);
  const selectedTier = priceTiers.find((t) => t.amountDzd === amountDzd);

  const basePrice = selectedTier?.priceEur ?? 0;
  const discount = paymentMethod === 'crypto' ? basePrice * (cryptoDiscountPercent / 100) : 0;
  const totalPrice = Math.round((basePrice - discount) * 100) / 100;

  // Track visitor stats
  useEffect(() => {
    const stats = JSON.parse(localStorage.getItem('topup-stats') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const idx = stats.findIndex((s: any) => s.date === today);
    if (idx >= 0) {
      stats[idx].pageViews = (stats[idx].pageViews || 0) + 1;
    } else {
      stats.push({ date: today, pageViews: 1, visitors: 1, orders: 0, revenue: 0 });
    }
    localStorage.setItem('topup-stats', JSON.stringify(stats));
  }, []);

  // Countdown timer for delay
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const runFraudCheck = (): boolean => {
    setError('');
    setFraudResult(null);

    if (!/^0[5-7][0-9]{8}$/.test(phone)) {
      setError(t('order.phone.hint')); return false;
    }
    if (!selectedOperator) { setError(t('order.selectOperator')); return false; }
    if (!amountDzd) { setError('Sélectionnez un montant'); return false; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email invalide'); return false;
    }

    const result = checkFraud(phone, email, amountDzd, honeypot.length > 0);
    setFraudResult(result);

    if (result.blocked) {
      setError(result.reasons.join(' • '));
      return false;
    }

    if (result.delayMs > 0) {
      setCountdown(Math.ceil(result.delayMs / 1000));
      return false; // Will retry after countdown
    }

    return true;
  };

  // Retry after countdown
  useEffect(() => {
    if (countdown === 0 && fraudResult && !fraudResult.blocked && fraudResult.delayMs > 0 && submitting) {
      doSubmit();
    }
  }, [countdown]);

  const doSubmit = () => {
    if (!selectedOperator || !amountDzd || !email) return;
    onSubmit({
      operatorId: selectedOperator.id,
      phoneNumber: phone,
      amount: amountDzd,
      priceEur: totalPrice,
      paymentMethod,
      email,
      fraudScore: fraudResult?.score ?? 0,
    });
  };

  const handleSubmit = () => {
    setSubmitting(true);
    const ok = runFraudCheck();
    if (ok) {
      doSubmit();
    } else if (countdown === 0) {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* HONEYPOT — invisible to humans, bots fill it */}
      <input
        ref={honeypotRef}
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }}
        aria-hidden="true"
      />

      {/* Phone Number */}
      <section className="text-center">
        <h2 className="mb-4 flex items-center justify-center gap-2 text-lg font-semibold text-white">
          <Phone className="h-5 w-5 text-violet-400" />
          {t('order.phone')}
        </h2>
        <div className="mx-auto max-w-sm">
          <Input
            value={phone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 10);
              setPhone(val);
              if (val.length >= 2 && detectOperatorByPrefix(val)) {
                setShowManual(false);
                setManualOperator(null);
              }
            }}
            placeholder={t('order.phone.placeholder')}
            className="h-20 rounded-xl border-white/10 bg-white/5 text-3xl text-center text-white placeholder:text-slate-700 placeholder:text-xl focus:border-violet-500 focus:ring-violet-500/20 tracking-wider"
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">{t('order.phone.hint')}</p>
      </section>
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Phone className="h-5 w-5 text-violet-400" />
          {t('order.phone')}
        </h2>
        <Input
          value={phone}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
            setPhone(val);
            if (val.length >= 2 && detectOperatorByPrefix(val)) {
              setShowManual(false);
              setManualOperator(null);
            }
          }}
          placeholder={t('order.phone.placeholder')}
          className="h-14 rounded-xl border-white/10 bg-white/5 text-lg text-white placeholder:text-slate-600 focus:border-violet-500 focus:ring-violet-500/20"
        />
        <p className="mt-2 text-xs text-slate-500">{t('order.phone.hint')}</p>
      </section>

      {/* Auto-detected Operator */}
      {detected && phone.length >= 2 && !showManual && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
            <Zap className="h-5 w-5 text-violet-400" />
            {t('order.detectedOperator')}
          </h2>
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-bold text-white ${detected.bgGradient}`}>
              {detected.logoText[0]}
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">{detected.name}</p>
              <p className="text-xs text-slate-500">{t('order.phone.hint')}</p>
            </div>
            <button
              onClick={() => { setShowManual(true); setManualOperator(''); }}
              className="text-xs text-violet-400 hover:text-violet-300 underline"
            >
              {t('order.changeOperator')}
            </button>
          </div>
        </section>
      )}

      {/* Manual Operator Selection */}
      {(!detected || showManual) && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Zap className="h-5 w-5 text-violet-400" />
            {t('order.selectOperator')}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {operators.map((op) => (
              <button
                key={op.id}
                onClick={() => { setManualOperator(op.id); setShowManual(true); }}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                  manualOperator === op.id
                    ? 'border-white/30 bg-white/10'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/15'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-sm font-bold text-white ${op.bgGradient}`}>
                  {op.logoText[0]}
                </div>
                <span className="text-xs font-medium text-white">{op.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Email */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
          <Mail className="h-4 w-4 text-violet-400" />
          {t('order.email')}
        </h2>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('order.email.placeholder')}
          className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-600 focus:border-violet-500"
        />
        <p className="mt-1 text-xs text-slate-500">{t('order.email.hint')}</p>
      </section>

      {/* Amount Selection */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Tag className="h-5 w-5 text-violet-400" />
          {t('order.amount')}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {priceTiers.map((tier) => (
            <button
              key={tier.amountDzd}
              onClick={() => setAmountDzd(tier.amountDzd)}
              className={`relative rounded-xl border-2 p-4 text-center transition-all ${
                amountDzd === tier.amountDzd
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/15'
              }`}
            >
              {tier.popular && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-violet-500 text-[10px] font-bold">
                  {t('order.popular')}
                </Badge>
              )}
              <div className="text-2xl font-bold text-white">{tier.amountDzd}</div>
              <div className="text-xs text-slate-400">DZD</div>
              <div className="mt-1 text-sm font-semibold text-emerald-400">{tier.priceEur} €</div>
            </button>
          ))}
        </div>
      </section>

      {/* Payment Method */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">{t('payment.method')}</h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setPaymentMethod('paypal')}
            className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-4 transition-all ${
              paymentMethod === 'paypal'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-white/5 bg-white/[0.02] hover:border-white/15'
            }`}
          >
            <Wallet className="h-6 w-6 text-blue-400" />
            <span className="text-xs font-semibold text-white">{t('payment.paypal')}</span>
          </button>
          <button
            onClick={() => setPaymentMethod('card')}
            className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-4 transition-all ${
              paymentMethod === 'card'
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-white/5 bg-white/[0.02] hover:border-white/15'
            }`}
          >
            <CreditCard className="h-6 w-6 text-indigo-400" />
            <span className="text-xs font-semibold text-white">{t('payment.card')}</span>
            <span className="text-[10px] text-slate-500">{t('payment.card.sub')}</span>
          </button>
          <button
            onClick={() => setPaymentMethod('crypto')}
            className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-4 transition-all ${
              paymentMethod === 'crypto'
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-white/5 bg-white/[0.02] hover:border-white/15'
            }`}
          >
            <Bitcoin className="h-6 w-6 text-amber-400" />
            <span className="text-xs font-semibold text-white">{t('payment.crypto')}</span>
            <Badge className="absolute -top-2 right-2 bg-emerald-500 text-[9px]">{t('payment.cryptoDiscount')}</Badge>
          </button>
        </div>
      </section>

      {/* Summary */}
      {selectedTier && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-5 space-y-3">
            {selectedOperator && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{t('payment.operator')}</span>
                <span className="font-medium text-white flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedOperator.color }} />
                  {selectedOperator.name}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">{t('order.amount')}</span>
              <span className="font-medium text-white">{selectedTier.amountDzd} DZD</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">{t('order.total')}</span>
              <span className="font-medium text-white">{basePrice.toFixed(2)} €</span>
            </div>
            {paymentMethod === 'crypto' && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-400">{t('order.cryptoDiscount')} ({cryptoDiscountPercent}%)</span>
                <span className="font-medium text-emerald-400">- {discount.toFixed(2)} €</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-3 flex justify-between">
              <span className="font-semibold text-white">{t('payment.total')}</span>
              <span className="text-xl font-bold text-white">{totalPrice.toFixed(2)} €</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fraud Alert */}
      {fraudResult && fraudResult.score > 0 && !fraudResult.blocked && (
        <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-200">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-xs">
            Vérification de sécurité en cours ({fraudResult.score}/100)...
            {countdown > 0 && <span className="ml-2"><Timer className="inline h-3 w-3" /> {countdown}s</span>}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-500/30 bg-red-500/10 text-red-200">
          <ShieldAlert className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!selectedTier || !selectedOperator || countdown > 0}
        className="w-full h-14 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-base font-bold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
      >
        {countdown > 0 ? (
          <><Timer className="mr-2 h-5 w-5" /> Vérification... {countdown}s</>
        ) : (
          <>{t('order.proceed')} <ArrowRight className="ml-2 h-5 w-5" /></>
        )}
      </Button>

      {/* Security trust badge */}
      <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Anti-fraude actif</span>
        <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> Rate limit</span>
        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email vérifié</span>
      </div>
    </div>
  );
}
