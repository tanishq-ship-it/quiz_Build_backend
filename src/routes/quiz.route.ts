import { Router } from 'express';
import { createQuiz, getQuiz, getQuizzes } from '../controllers/quiz.controller';

const router = Router();

// Create a new quiz
router.post('/quizzes', createQuiz);

// List quizzes
router.get('/quizzes', getQuizzes);

// Get a quiz by id
router.get('/quizzes/:id', getQuiz);

export default router;



