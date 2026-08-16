import type { Operator, PriceTier } from '@/types';

export const operators: Operator[] = [
  {
    id: 'ooredoo',
    name: 'Ooredoo',
    color: '#ED1C24',
    bgGradient: 'from-red-500 to-rose-700',
    logoText: 'Ooredoo',
    ussdPrefix: '*102*',
    active: true,
    prefixes: ['05'],
  },
  {
    id: 'mobilis',
    name: 'Mobilis',
    color: '#0055A4',
    bgGradient: 'from-blue-500 to-indigo-700',
    logoText: 'Mobilis',
    ussdPrefix: '*103*',
    active: true,
    prefixes: ['06'],
  },
  {
    id: 'djezzy',
    name: 'Djezzy',
    color: '#00A651',
    bgGradient: 'from-emerald-500 to-green-700',
    logoText: 'Djezzy',
    ussdPrefix: '*100*',
    active: true,
    prefixes: ['07'],
  },
];

export function detectOperatorByPrefix(phone: string): Operator | undefined {
  const prefix = phone.slice(0, 2);
  return operators.find((op) => op.prefixes.includes(prefix));
}

export const priceTiers: PriceTier[] = [
  { amountDzd: 200, priceEur: 1.50 },
  { amountDzd: 500, priceEur: 3.50 },
  { amountDzd: 1000, priceEur: 6.50, popular: true },
  { amountDzd: 2000, priceEur: 12.00 },
];

export const cryptoDiscountPercent = 5;

/* ============================================================
   RÈGLES ANTI-FRAUDE & ANTI-SPAM — TopUp DZ
   ============================================================ */

export interface FraudCheck {
  passed: boolean;
  score: number;        // 0-100, plus c'est bas = plus sûr
  reasons: string[];
  blocked: boolean;
  delayMs: number;      // délai imposé avant soumission
}

const FRAUD_CONFIG = {
  maxAttemptsPerHour: 5,
  maxAttemptsPerDay: 15,
  maxSameNumberPerDay: 3,
  maxSameEmailPerDay: 5,
  minDelayBetweenAttemptsMs: 5000,
  suspiciousEmailDomains: ['tempmail', '10minutemail', 'guerrillamail', 'throwaway', 'mailinator', 'yopmail'],
  maxAmountFirstOrder: 1000,
  highRiskCountries: [], // à remplir côté backend avec GeoIP
};

function getAttemptLog(): Array<{ timestamp: number; email: string; phone: string; amount: number }> {
  try {
    return JSON.parse(localStorage.getItem('topup-attempts') || '[]');
  } catch { return []; }
}

function logAttempt(email: string, phone: string, amount: number) {
  const logs = getAttemptLog();
  logs.push({ timestamp: Date.now(), email, phone, amount });
  // Garder 7 jours
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  localStorage.setItem('topup-attempts', JSON.stringify(logs.filter(l => l.timestamp > cutoff)));
}

function countRecent(logs: Array<{timestamp: number}>, windowMs: number): number {
  const cutoff = Date.now() - windowMs;
  return logs.filter(l => l.timestamp > cutoff).length;
}

export function checkFraud(phone: string, email: string, amount: number, honeypotFilled: boolean): FraudCheck {
  const reasons: string[] = [];
  let score = 0;
  let blocked = false;
  let delayMs = 0;

  const logs = getAttemptLog();
  const now = Date.now();

  // 1. HONEYPOT — Champ invisible rempli = BOT
  if (honeypotFilled) {
    score += 100;
    reasons.push('Honeypot déclenché — comportement bot détecté');
    blocked = true;
  }

  // 2. RATE LIMITING — Trop de tentatives rapides
  const recent1h = countRecent(logs, 60 * 60 * 1000);
  const recent24h = countRecent(logs, 24 * 60 * 60 * 1000);

  if (recent1h >= FRAUD_CONFIG.maxAttemptsPerHour) {
    score += 40;
    reasons.push(`Trop de tentatives (${recent1h} en 1h) — veuillez patienter`);
    blocked = true;
    delayMs = 600000; // 10 min
  }
  if (recent24h >= FRAUD_CONFIG.maxAttemptsPerDay) {
    score += 50;
    reasons.push(`Limite journalière atteinte (${recent24h})`);
    blocked = true;
  }

  // 3. DÉLAI MINIMUM entre tentatives (anti-script)
  const lastAttempt = logs.length > 0 ? logs[logs.length - 1].timestamp : 0;
  const timeSinceLast = now - lastAttempt;
  if (timeSinceLast < FRAUD_CONFIG.minDelayBetweenAttemptsMs) {
    score += 15;
    reasons.push('Tentative trop rapide — comportement automatisé suspect');
    delayMs = Math.max(delayMs, FRAUD_CONFIG.minDelayBetweenAttemptsMs - timeSinceLast);
  }

  // 4. MÊME NUMÉRO — Limite par jour
  const samePhoneToday = logs.filter(l => l.phone === phone && l.timestamp > now - 24 * 60 * 60 * 1000).length;
  if (samePhoneToday >= FRAUD_CONFIG.maxSameNumberPerDay) {
    score += 30;
    reasons.push(`Ce numéro a déjà été utilisé ${samePhoneToday} fois aujourd'hui`);
    blocked = true;
  }

  // 5. MÊME EMAIL — Limite par jour
  const sameEmailToday = logs.filter(l => l.email.toLowerCase() === email.toLowerCase() && l.timestamp > now - 24 * 60 * 60 * 1000).length;
  if (sameEmailToday >= FRAUD_CONFIG.maxSameEmailPerDay) {
    score += 25;
    reasons.push(`Cet email a déjà été utilisé ${sameEmailToday} fois aujourd'hui`);
    blocked = true;
  }

  // 6. EMAIL JETABLE / SUSPECT
  const domain = email.split('@')[1]?.toLowerCase() || '';
  if (FRAUD_CONFIG.suspiciousEmailDomains.some(d => domain.includes(d))) {
    score += 35;
    reasons.push('Email jetable détecté — vérification requise');
  }

  // 7. PREMIÈRE COMMANDE — Plafonnement
  if (logs.length === 0 && amount > FRAUD_CONFIG.maxAmountFirstOrder) {
    score += 20;
    reasons.push(`Première commande limitée à ${FRAUD_CONFIG.maxAmountFirstOrder} DZD pour votre sécurité`);
    blocked = true;
  }

  // 8. MONTANT SUSPECT — Double vérification
  if (amount >= 2000) {
    score += 10;
    reasons.push('Montant élevé — double vérification en cours');
    delayMs = Math.max(delayMs, 3000);
  }

  // 9. NUMÉRO INVALIDE / FORMAT SUSPECT
  if (!/^0[5-7][0-9]{8}$/.test(phone)) {
    score += 100;
    reasons.push('Format de numéro invalide');
    blocked = true;
  }

  // 10. PATTERN CARDING — Tentatives séquentielles sur montants différents
  const recentAttempts = logs.filter(l => l.timestamp > now - 5 * 60 * 1000);
  const uniqueAmounts = new Set(recentAttempts.map(l => l.amount)).size;
  if (recentAttempts.length >= 3 && uniqueAmounts >= 3) {
    score += 45;
    reasons.push('Pattern de test de montants détecté (carding)');
    blocked = true;
  }

  // Logger cette tentative (même si bloquée — pour l'audit)
  logAttempt(email, phone, amount);

  // Stocker l'alerte pour le dashboard admin
  if (score >= 20) {
    const alerts = JSON.parse(localStorage.getItem('topup-alerts') || '[]');
    alerts.unshift({
      id: 'ALT-' + Date.now().toString(36).toUpperCase(),
      timestamp: new Date().toISOString(),
      phone,
      email,
      amount,
      score,
      reasons,
      blocked,
    });
    localStorage.setItem('topup-alerts', JSON.stringify(alerts.slice(0, 100)));
  }

  return { passed: !blocked && reasons.length === 0, score, reasons, blocked, delayMs };
}

export function getFraudAlerts() {
  try {
    return JSON.parse(localStorage.getItem('topup-alerts') || '[]');
  } catch { return []; }
}
