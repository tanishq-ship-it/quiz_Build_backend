import { Router } from 'express';
import {
  createLead,
  updateLead,
  getLead,
  checkSubscription,
} from '../controllers/payment.controller';

const router = Router();

// ========== PUBLIC ROUTES ==========

// Create lead (Email Page 1 - before payment)
router.post('/leads', createLead);

// Update lead (Email Page 2 - after payment/skip)
router.patch('/leads/:leadId', updateLead);

// Get lead by ID
router.get('/leads/:leadId', getLead);

// Check subscription status
router.get('/leads/:leadId/subscription', checkSubscription);

export default router;
