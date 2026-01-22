import { Router } from 'express';
import type { Request, Response } from 'express';
import { REVENUECAT_WEBHOOK_SECRET } from '../config/revenuecat';
import * as paymentService from '../services/payment.service';
import type { RevenueCatWebhookEvent } from '../config/revenuecat';
import crypto from 'crypto';

const router = Router();

// Helper function to verify RevenueCat webhook signature
const verifyRevenueCatSignature = (payload: string, signature: string, secret: string): boolean => {
  if (!secret) {
    console.warn('REVENUECAT_WEBHOOK_SECRET not configured, skipping signature verification');
    return true; // Allow in development without secret
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

// RevenueCat webhook handler
router.post('/revenuecat', async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['x-revenuecat-signature'] as string;
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  // Verify webhook signature if secret is configured
  if (REVENUECAT_WEBHOOK_SECRET && signature) {
    const isValid = verifyRevenueCatSignature(rawBody, signature, REVENUECAT_WEBHOOK_SECRET);
    if (!isValid) {
      console.error('RevenueCat webhook signature verification failed');
      res.status(401).json({ message: 'Invalid webhook signature' });
      return;
    }
  }

  try {
    const event: RevenueCatWebhookEvent = typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body;

    console.log('RevenueCat webhook received:', event.event?.type);

    // Handle the webhook event
    await paymentService.handleRevenueCatWebhook(event);

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('RevenueCat webhook handler error:', error);
    res.status(500).json({ message: 'Webhook handler error' });
  }
});

export default router;
