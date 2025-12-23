import { Router } from 'express';
import { addQuizScreens, createQuiz, deleteQuizScreen, getQuiz, getQuizzes, updateQuizScreens, updateQuizLiveStatus, updateQuizDeletionStatus } from '../controllers/quiz.controller';

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

// Update quiz deletion status (soft delete)
router.patch('/quizzes/:id/deletion', updateQuizDeletionStatus);

// Get a quiz by id
router.get('/quizzes/:id', getQuiz);

// Delete a screen from quiz content
router.delete('/quizzes/:id/screens/:screenId', deleteQuizScreen);

export default router;



