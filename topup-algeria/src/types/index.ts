export interface Operator {
  id: string;
  name: string;
  color: string;
  bgGradient: string;
  logoText: string;
  ussdPrefix: string;
  active: boolean;
  prefixes: string[];
}

export interface Order {
  id: string;
  operatorId: string;
  phoneNumber: string;
  amount: number;
  priceEur: number;
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'failed';
  paymentMethod: 'paypal' | 'card' | 'crypto';
  createdAt: string;
  completedAt?: string;
  email: string;
  paypalRef?: string;
  ussdResponse?: string;
  fraudScore?: number;
}

export interface PriceTier {
  amountDzd: number;
  priceEur: number;
  popular?: boolean;
}

export type Language = 'fr' | 'ar' | 'en';

export interface VisitorStats {
  date: string;
  visitors: number;
  pageViews: number;
  orders: number;
  revenue: number;
}

export interface GeoStat {
  country: string;
  visitors: number;
  orders: number;
  flag: string;
}

export interface FraudAlert {
  id: string;
  timestamp: string;
  phone: string;
  email: string;
  amount: number;
  score: number;
  reasons: string[];
  blocked: boolean;
}
