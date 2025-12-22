import { Router } from 'express';
import { appendScreenResponse, createQuizResponse } from '../controllers/quizResponse.controller';

const router = Router();

router.post('/quiz-responses', createQuizResponse);
router.post('/quiz-responses/:id/screens', appendScreenResponse);

export default router;



