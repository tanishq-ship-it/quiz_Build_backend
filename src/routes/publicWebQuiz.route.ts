import { Router } from 'express';
import { getPublicWebQuiz } from '../controllers/webQuiz.controller';

const router = Router();

// GET /api/public/web-quiz - Get current active web quiz with quiz details (public)
router.get('/', getPublicWebQuiz);

export default router;
