import { Router } from 'express';
import { addQuizScreens, createQuiz, getQuiz, getQuizzes, updateQuizScreens, updateQuizLiveStatus } from '../controllers/quiz.controller';

const router = Router();

// Create a new quiz
router.post('/quizzes', createQuiz);

// List quizzes
router.get('/quizzes', getQuizzes);

// Append screens to quiz content
router.post('/quizzes/:id/screens', addQuizScreens);

// Replace all screens for a quiz
router.put('/quizzes/:id/screens', updateQuizScreens);

// Update quiz live status
router.patch('/quizzes/:id/live', updateQuizLiveStatus);

// Get a quiz by id
router.get('/quizzes/:id', getQuiz);

export default router;



