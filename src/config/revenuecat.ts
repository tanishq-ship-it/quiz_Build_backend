// RevenueCat Configuration
export const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY ?? '';
export const REVENUECAT_WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET ?? '';
export const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

// Your RevenueCat API keys (from your dashboard)
// export const REVENUECAT_PUBLIC_KEY = 'rcb_sb_VxqhPCleFgrPtzHoJdwVWlTii'; // Production
export const REVENUECAT_PUBLIC_KEY = 'rcb_NsfaLLSgQYGCCbHbtoCErUZcNJIc'; // Production
export const REVENUECAT_SANDBOX_KEY = 'rcb_sb_VxqhPCleFgrPtzHoJdwVWlTii'; // Sandbox/Testing

if (!REVENUECAT_API_KEY) {
  console.warn('Warning: REVENUECAT_API_KEY is not set');
}

// Plan configurations (matching RevenueCat products)
export const PLANS = {
  '1_month': {
    productId: 'new_monthly', // RevenueCat product identifier
    amount: 1299, // $12.99 in cents
    label: '1 Month',
  },
  '1_year': {
    productId: 'new_yearly_web', // RevenueCat product identifier
    amount: 6999, // $69.99 in cents
    label: '1 Year',
  },
} as const;

export type PlanType = keyof typeof PLANS;

export const isValidPlanType = (planType: string): planType is PlanType => {
  return planType in PLANS;
};

// RevenueCat Entitlement ID
export const PREMIUM_ENTITLEMENT_ID = 'Premium Courses';

// RevenueCat webhook event types
export type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'NON_RENEWING_PURCHASE'
  | 'SUBSCRIPTION_PAUSED'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'PRODUCT_CHANGE'
  | 'TRANSFER';

export interface RevenueCatWebhookEvent {
  api_version: string;
  event: {
    id: string;
    type: RevenueCatEventType;
    app_user_id: string;
    aliases: string[];
    original_app_user_id: string;
    product_id: string;
    entitlement_ids: string[];
    period_type: 'NORMAL' | 'INTRO' | 'TRIAL';
    purchased_at_ms: number;
    expiration_at_ms: number | null;
    environment: 'SANDBOX' | 'PRODUCTION';
    store: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL';
    is_family_share: boolean;
    presented_offering_id: string | null;
    transaction_id: string;
    original_transaction_id: string;
    price: number | null;
    currency: string | null;
    price_in_purchased_currency: number | null;
    tax_percentage: number | null;
    commission_percentage: number | null;
  };
}
