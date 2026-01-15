import { Router } from 'express';
import { appendScreenResponse, createQuizResponse } from '../controllers/quizResponse.controller';

const router = Router();

// Public endpoints for customers to submit quiz responses
router.post('/', createQuizResponse);
router.post('/:id/screens', appendScreenResponse);

export default router;
