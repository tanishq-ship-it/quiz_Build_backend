import { REVENUECAT_SECRET_KEY, REVENUECAT_STRIPE_PUBLIC_KEY } from '../config/env';

/**
 * RevenueCat Service for Backend
 *
 * Handles server-side RevenueCat operations for web purchases (Stripe).
 *
 * PROPER STRIPE INTEGRATION FLOW:
 * 1. User pays via Stripe on web
 * 2. Stripe webhook fires checkout.session.completed
 * 3. We POST the Stripe Checkout Session ID to RevenueCat /v1/receipts
 * 4. RevenueCat tracks the revenue and grants entitlements automatically
 *
 * This properly tracks revenue in RevenueCat dashboard!
 *
 * IMPORTANT: You must configure Stripe integration in RevenueCat:
 * 1. Go to RevenueCat Dashboard → Project Settings → Integrations → Stripe
 * 2. Connect your Stripe account
 * 3. Map your Stripe products to RevenueCat entitlements
 */

// Must match the entitlement ID in RevenueCat dashboard
const ENTITLEMENT_ID = 'Premium Courses';

interface RevenueCatSubscriber {
  request_date: string;
  subscriber: {
    entitlements: Record<string, {
      expires_date: string | null;
      product_identifier: string;
      purchase_date: string;
    }>;
    first_seen: string;
    original_app_user_id: string;
    subscriptions: Record<string, unknown>;
    non_subscriptions: Record<string, unknown>;
    subscriber_attributes?: Record<string, { value: string; updated_at_ms: number }>;
  };
}

interface RecordPurchaseResult {
  success: boolean;
  error?: string;
  subscriber?: RevenueCatSubscriber;
}

export const revenueCatService = {
  /**
   * Record a Stripe purchase in RevenueCat
   *
   * This is the CORRECT way to integrate Stripe with RevenueCat.
   * It sends the Stripe Checkout Session ID to RevenueCat, which:
   * - Tracks revenue properly
   * - Grants entitlements based on your product mapping
   * - Syncs with your mobile app
   *
   * @param appUserId - Clerk user ID (must match what app uses)
   * @param stripeSessionId - Stripe Checkout Session ID (cs_xxx) or Subscription ID (sub_xxx)
   */
  async recordStripePurchase(
    appUserId: string,
    stripeSessionId: string
  ): Promise<RecordPurchaseResult> {
    if (!REVENUECAT_STRIPE_PUBLIC_KEY) {
      console.error('[RevenueCat] Stripe public key not configured (REVENUECAT_STRIPE_PUBLIC_KEY)');
      return { success: false, error: 'RevenueCat Stripe public key not configured' };
    }

    try {
      console.log(`[RevenueCat] Recording Stripe purchase for user: ${appUserId}, session: ${stripeSessionId}`);

      const response = await fetch('https://api.revenuecat.com/v1/receipts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REVENUECAT_STRIPE_PUBLIC_KEY}`,
          'Content-Type': 'application/json',
          'X-Platform': 'stripe',
        },
        body: JSON.stringify({
          app_user_id: appUserId,
          fetch_token: stripeSessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[RevenueCat] Failed to record Stripe purchase:', data);
        return {
          success: false,
          error: data.message || data.code || 'Failed to record purchase',
        };
      }

      console.log(`[RevenueCat] ✅ Stripe purchase recorded for ${appUserId}`);
      console.log('[RevenueCat] Entitlements:', Object.keys(data.subscriber?.entitlements || {}));

      return {
        success: true,
        subscriber: data,
      };
    } catch (error) {
      console.error('[RevenueCat] Record Stripe purchase error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get or Create a subscriber in RevenueCat
   *
   * The GET endpoint automatically creates the subscriber if they don't exist.
   * This is the same behavior as Purchases.logIn(userId) in the SDK.
   *
   * @param appUserId - Clerk user ID (must match what app uses)
   */
  async getOrCreateSubscriber(appUserId: string): Promise<RevenueCatSubscriber | null> {
    if (!REVENUECAT_SECRET_KEY) {
      console.error('[RevenueCat] Secret key not configured');
      return null;
    }

    try {
      console.log(`[RevenueCat] Getting/creating subscriber: ${appUserId}`);

      const response = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${REVENUECAT_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RevenueCat] Failed to get/create subscriber:', errorText);
        return null;
      }

      const data = await response.json();
      console.log(`[RevenueCat] Subscriber ready: ${appUserId}`);
      return data;
    } catch (error) {
      console.error('[RevenueCat] Get/create subscriber error:', error);
      return null;
    }
  },

  /**
   * Set subscriber attributes (email, display name, etc.)
   *
   * This is equivalent to Purchases.setEmail() in the SDK.
   * Setting attributes on a non-existent subscriber will NOT create them.
   * Always call getOrCreateSubscriber first.
   *
   * @param appUserId - Clerk user ID
   * @param email - User's email (for Meta CAPI matching in webhooks)
   */
  async setSubscriberAttributes(appUserId: string, email?: string): Promise<boolean> {
    if (!REVENUECAT_SECRET_KEY) {
      console.error('[RevenueCat] Secret key not configured');
      return false;
    }

    try {
      const attributes: Record<string, { value: string }> = {};

      if (email) {
        attributes['$email'] = { value: email };
      }

      // Only make request if we have attributes to set
      if (Object.keys(attributes).length === 0) {
        console.log('[RevenueCat] No attributes to set');
        return true;
      }

      console.log(`[RevenueCat] Setting attributes for ${appUserId}:`, Object.keys(attributes));

      const response = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}/attributes`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${REVENUECAT_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ attributes }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[RevenueCat] Failed to set attributes:', errorText);
        return false;
      }

      console.log(`[RevenueCat] Attributes set for ${appUserId}`);
      return true;
    } catch (error) {
      console.error('[RevenueCat] Set attributes error:', error);
      return false;
    }
  },

  /**
   * Check if a user has an active entitlement
   */
  async hasActiveEntitlement(appUserId: string): Promise<boolean> {
    const subscriber = await this.getOrCreateSubscriber(appUserId);
    if (!subscriber) return false;

    const entitlement = subscriber.subscriber.entitlements[ENTITLEMENT_ID];
    if (!entitlement) return false;

    // Check if not expired
    if (entitlement.expires_date) {
      return new Date(entitlement.expires_date) > new Date();
    }

    return true; // Lifetime entitlement
  },

  /**
   * Revoke promotional entitlements from a user
   * Note: This only revokes promotional entitlements, not paid ones
   */
  async revokeEntitlement(appUserId: string): Promise<boolean> {
    if (!REVENUECAT_SECRET_KEY) {
      console.error('[RevenueCat] Secret key not configured');
      return false;
    }

    try {
      console.log(`[RevenueCat] Revoking ${ENTITLEMENT_ID} from ${appUserId}`);

      const response = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}/entitlements/${encodeURIComponent(ENTITLEMENT_ID)}/revoke_promotionals`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${REVENUECAT_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        console.log(`[RevenueCat] ✅ Entitlement revoked from ${appUserId}`);
      }

      return response.ok;
    } catch (error) {
      console.error('[RevenueCat] Revoke entitlement error:', error);
      return false;
    }
  },
};
