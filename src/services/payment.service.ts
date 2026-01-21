import type { PaymentLead } from '@prisma/client';
import { prisma } from '../config/prisma';
import { stripe, PRICES, FRONTEND_URL, isValidPlanType, type PlanType } from '../config/stripe';
import type Stripe from 'stripe';
import { clerkService } from './clerk.service';
import { revenueCatService } from './revenuecat.service';

// ========== CREATE LEAD (Email Page 1) ==========

export interface CreateLeadInput {
  email1: string;
  quizId?: string;
  quizResponseId?: string;
}

export const createLead = async (input: CreateLeadInput): Promise<PaymentLead> => {
  const { email1, quizId, quizResponseId } = input;

  // Create Clerk user immediately with email1
  let clerkUserId: string | null = null;
  const clerkResult = await clerkService.getOrCreateUser(email1);
  if (clerkResult.success && clerkResult.clerkUserId) {
    clerkUserId = clerkResult.clerkUserId;
    console.log(`[Clerk] User created/found with email1: ${email1}, userId: ${clerkUserId}`);
  }

  return prisma.paymentLead.create({
    data: {
      email1,
      quizId,
      quizResponseId,
      clerkUserId,
    },
  });
};

// ========== UPDATE LEAD (Email Page 2) ==========

export interface UpdateLeadInput {
  email2: string;
  planType?: string | null;
  paid: boolean;
  stripeSessionId?: string | null;
  deviceType?: string | null;
}

export const updateLead = async (
  leadId: string,
  input: UpdateLeadInput
): Promise<PaymentLead> => {
  const { email2, planType, paid, stripeSessionId, deviceType } = input;

  const amountInCents = planType && isValidPlanType(planType)
    ? PRICES[planType].amount
    : null;

  // Get existing lead to check email1 and clerkUserId
  const existingLead = await prisma.paymentLead.findUnique({
    where: { id: leadId },
  });

  if (!existingLead) {
    throw new Error('Lead not found');
  }

  let clerkUserId = existingLead.clerkUserId;

  if (email2) {
    // Check if we already have a Clerk user from email1
    if (clerkUserId) {
      // User exists - check if email2 is different from email1
      if (email2.toLowerCase() !== existingLead.email1.toLowerCase()) {
        // Email is different - update Clerk user's email
        console.log(`[Clerk] Emails different. email1: ${existingLead.email1}, email2: ${email2}. Updating...`);
        const updateResult = await clerkService.updateUserEmail(clerkUserId, email2);
        if (updateResult.success) {
          console.log(`[Clerk] Email updated for user ${clerkUserId}: ${email2}`);
        } else {
          console.error(`[Clerk] Failed to update email: ${updateResult.error}`);
        }
      } else {
        console.log(`[Clerk] Emails match, no update needed: ${email2}`);
      }
    } else {
      // No Clerk user yet - create one with email2
      const clerkResult = await clerkService.getOrCreateUser(email2);
      if (clerkResult.success && clerkResult.clerkUserId) {
        clerkUserId = clerkResult.clerkUserId;
        console.log(`[Clerk] User created with email2: ${email2}, userId: ${clerkUserId}`);
      }
    }

    // Record Stripe purchase in RevenueCat if user paid and has a session ID
    if (paid && stripeSessionId && clerkUserId) {
      // First create/get subscriber in RevenueCat (required before setting attributes)
      await revenueCatService.getOrCreateSubscriber(clerkUserId);

      // Set email attribute for the user (use email2 as it's the confirmed email)
      await revenueCatService.setSubscriberAttributes(clerkUserId, email2);

      // Then record the Stripe purchase - this tracks revenue properly!
      const rcResult = await revenueCatService.recordStripePurchase(clerkUserId, stripeSessionId);
      if (rcResult.success) {
        console.log(`[RevenueCat] Stripe purchase recorded for user ${clerkUserId}, session: ${stripeSessionId}`);
      } else {
        console.error(`[RevenueCat] Failed to record Stripe purchase: ${rcResult.error}`);
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
      stripeSessionId,
      deviceType,
      paidAt: paid ? new Date() : null,
      clerkUserId,
    },
  });
};

// ========== GET LEAD ==========

export const getLeadById = async (leadId: string): Promise<PaymentLead | null> => {
  return prisma.paymentLead.findUnique({
    where: { id: leadId },
  });
};

export const getLeadBySessionId = async (sessionId: string): Promise<PaymentLead | null> => {
  return prisma.paymentLead.findUnique({
    where: { stripeSessionId: sessionId },
  });
};

// ========== CREATE CHECKOUT SESSION ==========

export interface CreateCheckoutInput {
  leadId: string;
  planType: PlanType;
}

export const createCheckoutSession = async (
  input: CreateCheckoutInput
): Promise<{ sessionId: string; url: string }> => {
  const { leadId, planType } = input;

  // Validate plan type
  if (!isValidPlanType(planType)) {
    throw new Error(`Invalid plan type: ${planType}`);
  }

  const priceConfig = PRICES[planType];
  if (!priceConfig.id) {
    throw new Error(`Price ID not configured for plan: ${planType}`);
  }

  // Get lead to include email in checkout
  const lead = await prisma.paymentLead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceConfig.id,
        quantity: 1,
      },
    ],
    customer_email: lead.email1,
    success_url: `${FRONTEND_URL}/email-confirm/${lead.quizId || 'unknown'}?session_id={CHECKOUT_SESSION_ID}&paid=true&plan=${planType}&lead_id=${leadId}`,
    cancel_url: `${FRONTEND_URL}/payment/cancel?quiz_id=${lead.quizId || ''}&lead_id=${leadId}`,
    metadata: {
      leadId,
      planType,
      quizId: lead.quizId || '',
      quizResponseId: lead.quizResponseId || '',
    },
  });

  if (!session.url) {
    throw new Error('Failed to create checkout session URL');
  }

  return {
    sessionId: session.id,
    url: session.url,
  };
};

// ========== WEBHOOK HANDLERS ==========

export const handleCheckoutCompleted = async (
  session: Stripe.Checkout.Session
): Promise<void> => {
  const leadId = session.metadata?.leadId;
  const planType = session.metadata?.planType;

  if (!leadId) {
    console.error('No leadId in session metadata');
    return;
  }

  // Update lead with Stripe info (email2 will be updated when user submits email form)
  await prisma.paymentLead.update({
    where: { id: leadId },
    data: {
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id,
      planType,
      amountInCents: session.amount_total,
      paid: true,
      paidAt: new Date(),
    },
  });

  console.log(`Payment completed for lead: ${leadId}`);
};

export const handleCheckoutExpired = async (
  session: Stripe.Checkout.Session
): Promise<void> => {
  const leadId = session.metadata?.leadId;

  if (!leadId) {
    console.log('No leadId in expired session metadata');
    return;
  }

  console.log(`Checkout expired for lead: ${leadId}`);
  // We don't update anything - user can retry or skip
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
