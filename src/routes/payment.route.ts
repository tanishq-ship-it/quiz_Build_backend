import { Router } from 'express';
import {
  createLead,
  updateLead,
  getLead,
  getLeadBySession,
  createCheckoutSession,
  getAllLeads,
  getLeadsByQuiz,
} from '../controllers/payment.controller';

const router = Router();

// ========== PUBLIC ROUTES ==========

// Create lead (Email Page 1 - before payment)
router.post('/leads', createLead);

// Update lead (Email Page 2 - after payment/skip)
router.patch('/leads/:leadId', updateLead);

// Get lead by ID
router.get('/leads/:leadId', getLead);

// Get lead by Stripe session ID
router.get('/leads/session/:sessionId', getLeadBySession);

// Create Stripe checkout session
router.post('/checkout', createCheckoutSession);

export default router;
