import Stripe from 'stripe';

export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '';
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
export const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

if (!STRIPE_SECRET_KEY) {
  console.warn('Warning: STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  typescript: true,
});

// Fixed price configurations
export const PRICES = {
  '1_month': {
    id: process.env.STRIPE_PRICE_1_MONTH ?? '',
    amount: 1299, // $12.99 in cents
    label: '1 Month',
  },
  '3_month': {
    id: process.env.STRIPE_PRICE_3_MONTH ?? '',
    amount: 2999, // $29.99 in cents
    label: '3 Months',
  },
  '1_year': {
    id: process.env.STRIPE_PRICE_1_YEAR ?? '',
    amount: 9999, // $99.99 in cents
    label: '1 Year',
  },
} as const;

export type PlanType = keyof typeof PRICES;

export const isValidPlanType = (planType: string): planType is PlanType => {
  return planType in PRICES;
};
