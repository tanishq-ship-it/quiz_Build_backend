import { Router } from 'express';
import { addQuizScreens, createQuiz, deleteQuizScreen, getQuiz, getQuizzes, updateQuizScreens, updateQuizLiveStatus, updateQuizDeletionStatus } from '../controllers/quiz.controller';

const router = Router();

// Create a new quiz
router.post('/', createQuiz);

// List quizzes
router.get('/', getQuizzes);

// Append screens to quiz content
router.post('/:id/screens', addQuizScreens);

// Replace all screens for a quiz
router.put('/:id/screens', updateQuizScreens);

// Update quiz live status
router.patch('/:id/live', updateQuizLiveStatus);

// Update quiz deletion status (soft delete)
router.patch('/:id/deletion', updateQuizDeletionStatus);

// Get a quiz by id
router.get('/:id', getQuiz);

// Delete a screen from quiz content
router.delete('/:id/screens/:screenId', deleteQuizScreen);

export default router;



