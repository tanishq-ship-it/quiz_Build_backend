import { Router } from 'express';
import {
  getWebQuiz,
  setWebQuizController,
  unsetWebQuizController,
} from '../controllers/webQuiz.controller';

const router = Router();

// GET /api/web-quiz - Get current active web quiz
router.get('/', getWebQuiz);

// POST /api/web-quiz - Set a quiz as the website quiz
router.post('/', setWebQuizController);

// DELETE /api/web-quiz/:quizId - Unset a quiz as website quiz
router.delete('/:quizId', unsetWebQuizController);

export default router;
