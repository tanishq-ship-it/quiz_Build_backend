import { Router } from 'express';
import { appendScreenResponse, createPreviewQuizResponse } from '../controllers/quizResponse.controller';

const router = Router();

router.post('/', createPreviewQuizResponse);
router.post('/:id/screens', appendScreenResponse);

export default router;



