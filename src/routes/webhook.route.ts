import { Router } from 'express';
import type { Request, Response } from 'express';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../config/stripe';
import * as paymentService from '../services/payment.service';
import type Stripe from 'stripe';

const router = Router();

// Stripe webhook handler
// Note: This route expects raw body (not JSON parsed)
router.post('/stripe', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    res.status(400).json({ message: 'Missing stripe-signature header' });
    return;
  }

  let event: Stripe.Event;

  try {
    // req.body should be raw buffer for webhook verification
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).json({ message: 'Webhook signature verification failed' });
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await paymentService.handleCheckoutCompleted(session);
        console.log('Checkout session completed:', session.id);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await paymentService.handleCheckoutExpired(session);
        console.log('Checkout session expired:', session.id);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ message: 'Webhook handler error' });
  }
});

export default router;
