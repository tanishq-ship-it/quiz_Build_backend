import { Router } from 'express';
import { getAllLeads, getLeadsByQuiz } from '../controllers/payment.controller';

const router = Router();

// ========== ADMIN ROUTES (Protected) ==========

// Get all leads
router.get('/leads', getAllLeads);

// Get leads by quiz ID
router.get('/leads/quiz/:quizId', getLeadsByQuiz);

export default router;
