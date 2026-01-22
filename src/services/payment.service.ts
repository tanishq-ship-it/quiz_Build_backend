import type { PaymentLead } from '@prisma/client';
import { prisma } from '../config/prisma';
import { PLANS, isValidPlanType, type PlanType, type RevenueCatWebhookEvent } from '../config/revenuecat';
import * as clerkService from './clerk.service';

// ========== CREATE LEAD (Email Page 1) ==========

export interface CreateLeadInput {
  email1: string;
  quizId?: string;
  quizResponseId?: string;
}

export const createLead = async (input: CreateLeadInput): Promise<PaymentLead> => {
  const { email1, quizId, quizResponseId } = input;

  // Create Clerk user first (without username)
  const clerkUser = await clerkService.createClerkUser(email1);

  if (!clerkUser) {
    throw new Error('Failed to create Clerk user');
  }

  return prisma.paymentLead.create({
    data: {
      email1,
      quizId,
      quizResponseId,
      clerkUserId: clerkUser.id,
    },
  });
};

// ========== UPDATE LEAD (Email Page 2) ==========

export interface UpdateLeadInput {
  email2: string;
  planType?: string | null;
  paid: boolean;
  revenuecatUserId?: string | null;
  deviceType?: string | null;
}

export const updateLead = async (
  leadId: string,
  input: UpdateLeadInput
): Promise<PaymentLead> => {
  const { email2, planType, paid, revenuecatUserId, deviceType } = input;

  const amountInCents = planType && isValidPlanType(planType)
    ? PLANS[planType].amount
    : null;

  // Get the existing lead to check if email changed
  const existingLead = await prisma.paymentLead.findUnique({
    where: { id: leadId },
  });

  if (!existingLead) {
    throw new Error('Lead not found');
  }

  // If email2 is different from email1, update Clerk user email
  if (email2 && existingLead.email1 !== email2 && existingLead.clerkUserId) {
    console.log('Email changed, updating Clerk user...');
    console.log('Old email (email1):', existingLead.email1);
    console.log('New email (email2):', email2);

    // Get the Clerk user to find the old email address ID
    const clerkUser = await clerkService.getClerkUser(existingLead.clerkUserId);

    if (clerkUser) {
      // Find the old email address ID
      const oldEmailAddress = clerkUser.email_addresses.find(
        (e) => e.email_address === existingLead.email1
      );

      // Add new email as primary
      const newEmailResult = await clerkService.updateClerkUserEmail(
        existingLead.clerkUserId,
        email2
      );

      if (newEmailResult && oldEmailAddress) {
        // Delete the old email address
        await clerkService.deleteClerkEmailAddress(oldEmailAddress.id);
        console.log('Old email address deleted from Clerk');
      }
    }
  }

  return prisma.paymentLead.update({
    where: { id: leadId },
    data: {
      email2,
      planType,
      paid,
      amountInCents,
      revenuecatUserId,
      deviceType,
      paidAt: paid ? new Date() : null,
    },
  });
};

// ========== GET LEAD ==========

export const getLeadById = async (leadId: string): Promise<PaymentLead | null> => {
  return prisma.paymentLead.findUnique({
    where: { id: leadId },
  });
};

export const getLeadByRevenueCatUserId = async (revenuecatUserId: string): Promise<PaymentLead | null> => {
  return prisma.paymentLead.findFirst({
    where: { revenuecatUserId },
  });
};

export const getLeadByClerkUserId = async (clerkUserId: string): Promise<PaymentLead | null> => {
  return prisma.paymentLead.findUnique({
    where: { clerkUserId },
  });
};

// ========== REVENUECAT WEBHOOK HANDLERS ==========

export const handleRevenueCatWebhook = async (
  event: RevenueCatWebhookEvent
): Promise<void> => {
  const { type, app_user_id, product_id, entitlement_ids, price_in_purchased_currency, currency } = event.event;

  console.log(`RevenueCat webhook received: ${type} for user ${app_user_id}`);

  // Find lead by RevenueCat user ID or Clerk user ID
  // RevenueCat app_user_id should match the Clerk user ID we use
  let lead = await getLeadByRevenueCatUserId(app_user_id);

  if (!lead) {
    // Try finding by Clerk user ID (since we use Clerk ID as RevenueCat app_user_id)
    lead = await getLeadByClerkUserId(app_user_id);
  }

  if (!lead) {
    console.log(`No lead found for RevenueCat user: ${app_user_id}`);
    return;
  }

  // Determine plan type from product_id
  let planType: PlanType | null = null;
  for (const [key, value] of Object.entries(PLANS)) {
    if (value.productId === product_id) {
      planType = key as PlanType;
      break;
    }
  }

  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'NON_RENEWING_PURCHASE':
      // User subscribed or renewed
      await prisma.paymentLead.update({
        where: { id: lead.id },
        data: {
          paid: true,
          paidAt: new Date(),
          planType,
          amountInCents: price_in_purchased_currency
            ? Math.round(price_in_purchased_currency * 100)
            : null,
          revenuecatUserId: app_user_id,
          revenuecatTransactionId: event.event.transaction_id,
          subscriptionStatus: 'active',
          subscriptionExpiresAt: event.event.expiration_at_ms
            ? new Date(event.event.expiration_at_ms)
            : null,
        },
      });
      console.log(`Payment confirmed for lead: ${lead.id}`);
      break;

    case 'CANCELLATION':
      // User cancelled (but may still have access until expiration)
      await prisma.paymentLead.update({
        where: { id: lead.id },
        data: {
          subscriptionStatus: 'cancelled',
        },
      });
      console.log(`Subscription cancelled for lead: ${lead.id}`);
      break;

    case 'UNCANCELLATION':
      // User reactivated their subscription
      await prisma.paymentLead.update({
        where: { id: lead.id },
        data: {
          subscriptionStatus: 'active',
        },
      });
      console.log(`Subscription reactivated for lead: ${lead.id}`);
      break;

    case 'EXPIRATION':
      // Subscription expired
      await prisma.paymentLead.update({
        where: { id: lead.id },
        data: {
          subscriptionStatus: 'expired',
          paid: false, // No longer has active access
        },
      });
      console.log(`Subscription expired for lead: ${lead.id}`);
      break;

    case 'BILLING_ISSUE':
      // Payment failed
      await prisma.paymentLead.update({
        where: { id: lead.id },
        data: {
          subscriptionStatus: 'billing_issue',
        },
      });
      console.log(`Billing issue for lead: ${lead.id}`);
      break;

    case 'PRODUCT_CHANGE':
      // User changed their plan
      await prisma.paymentLead.update({
        where: { id: lead.id },
        data: {
          planType,
          subscriptionStatus: 'active',
        },
      });
      console.log(`Plan changed for lead: ${lead.id}`);
      break;

    default:
      console.log(`Unhandled RevenueCat event type: ${type}`);
  }
};

// ========== CHECK SUBSCRIPTION STATUS ==========

export const checkSubscriptionStatus = async (leadId: string): Promise<{
  isPremium: boolean;
  status: string | null;
  expiresAt: Date | null;
}> => {
  const lead = await prisma.paymentLead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    return { isPremium: false, status: null, expiresAt: null };
  }

  // Check if subscription is still valid
  const now = new Date();
  const isActive = lead.subscriptionStatus === 'active' || lead.subscriptionStatus === 'cancelled';
  const isNotExpired = !lead.subscriptionExpiresAt || lead.subscriptionExpiresAt > now;

  return {
    isPremium: isActive && isNotExpired && lead.paid,
    status: lead.subscriptionStatus,
    expiresAt: lead.subscriptionExpiresAt,
  };
};

// ========== ADMIN QUERIES ==========

export const getAllLeads = async (): Promise<PaymentLead[]> => {
  return prisma.paymentLead.findMany({
    orderBy: { createdAt: 'desc' },
  });
};

export const getLeadsByQuizId = async (quizId: string): Promise<PaymentLead[]> => {
  return prisma.paymentLead.findMany({
    where: { quizId },
    orderBy: { createdAt: 'desc' },
  });
};

export const getPaidLeads = async (): Promise<PaymentLead[]> => {
  return prisma.paymentLead.findMany({
    where: { paid: true },
    orderBy: { createdAt: 'desc' },
  });
};

// Re-export for backwards compatibility
export { isValidPlanType, type PlanType };
