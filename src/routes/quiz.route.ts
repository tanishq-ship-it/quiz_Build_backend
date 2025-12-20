import { Router } from 'express';
import { addQuizScreens, createQuiz, getQuiz, getQuizzes } from '../controllers/quiz.controller';

const router = Router();

// Create a new quiz
router.post('/quizzes', createQuiz);

// List quizzes
router.get('/quizzes', getQuizzes);

// Append screens to quiz content
router.post('/quizzes/:id/screens', addQuizScreens);

// Get a quiz by id
router.get('/quizzes/:id', getQuiz);

export default router;



