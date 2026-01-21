import { REVENUECAT_SECRET_KEY } from '../config/env';

/**
 * RevenueCat Service for Backend
 *
 * Handles server-side RevenueCat operations for web purchases (Stripe).
 *
 * Flow:
 * 1. User pays via Stripe on web
 * 2. Clerk user is created
 * 3. RevenueCat subscriber is created (using Clerk ID as app_user_id)
 * 4. Promotional entitlement is granted based on plan duration
 *
 * This mirrors what the app SDK does:
 * - App: Purchases.logIn(clerkUserId) → creates subscriber
 * - Backend: GET /subscribers/{clerkUserId} → creates subscriber if not exists
 */

// Map Stripe plan types to RevenueCat durations
// RevenueCat supports: daily, three_day, weekly, monthly, two_month, three_month, six_month, yearly, lifetime
type RevenueCatDuration = 'daily' | 'three_day' | 'weekly' | 'monthly' | 'two_month' | 'three_month' | 'six_month' | 'yearly' | 'lifetime';

const PLAN_TO_DURATION: Record<string, RevenueCatDuration> = {
  // Stripe plan types
  '1_month': 'monthly',
  '3_month': 'three_month',
  '1_year': 'yearly',
  // RevenueCat product identifiers (from app)
  'new_course_monthly': 'monthly',
  'new_course_yearly': 'yearly',
  'new_course_quaterly': 'three_month',
};

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
    subscriber_attributes?: Record<string, { value: string; updated_at_ms: number }>;
  };
}

interface GrantEntitlementResult {
  success: boolean;
  error?: string;
  subscriber?: RevenueCatSubscriber;
}

export const revenueCatService = {
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
   * Grant a promotional entitlement to a user
   *
   * Complete flow:
   * 1. Get or create the subscriber
   * 2. Set email attribute (for Meta CAPI)
   * 3. Grant the promotional entitlement
   *
   * @param appUserId - Clerk user ID
   * @param planType - Plan type from Stripe (1_month, 3_month, 1_year)
   * @param email - User's email
   */
  async grantEntitlement(
    appUserId: string,
    planType: string,
    email?: string
  ): Promise<GrantEntitlementResult> {
    if (!REVENUECAT_SECRET_KEY) {
      console.error('[RevenueCat] Secret key not configured');
      return { success: false, error: 'RevenueCat secret key not configured' };
    }

    const duration = PLAN_TO_DURATION[planType];
    if (!duration) {
      console.error('[RevenueCat] Unknown plan type:', planType);
      return { success: false, error: `Unknown plan type: ${planType}` };
    }

    try {
      // Step 1: Get or create subscriber (like Purchases.logIn in SDK)
      const subscriber = await this.getOrCreateSubscriber(appUserId);
      if (!subscriber) {
        return { success: false, error: 'Failed to create subscriber in RevenueCat' };
      }

      // Step 2: Set email attribute (like Purchases.setEmail in SDK)
      if (email) {
        await this.setSubscriberAttributes(appUserId, email);
      }

      // Step 3: Grant promotional entitlement
      console.log(`[RevenueCat] Granting ${ENTITLEMENT_ID} (${duration}) to ${appUserId}`);

      const response = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}/entitlements/${encodeURIComponent(ENTITLEMENT_ID)}/promotional`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${REVENUECAT_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ duration }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('[RevenueCat] Failed to grant entitlement:', data);
        return {
          success: false,
          error: data.message || data.error_message || 'Failed to grant entitlement',
        };
      }

      console.log(`[RevenueCat] ✅ Entitlement granted: ${ENTITLEMENT_ID} (${duration}) to ${appUserId}`);
      return {
        success: true,
        subscriber: data,
      };
    } catch (error) {
      console.error('[RevenueCat] Grant entitlement error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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
