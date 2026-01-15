import { Router } from 'express';
import { getQuiz } from '../controllers/quiz.controller';

const router = Router();

// Public endpoint to get a quiz by id (for customers)
router.get('/:id', getQuiz);

export default router;
