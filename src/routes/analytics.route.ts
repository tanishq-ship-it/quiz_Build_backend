import { Router } from 'express';
import { listQuizzesForAnalytics, getQuizAnalyticsById } from '../controllers/analytics.controller';

const router = Router();

// GET /api/analytics/quizzes - List all quizzes with response counts
router.get('/quizzes', listQuizzesForAnalytics);

// GET /api/analytics/quizzes/:quizId - Get full analytics for a quiz
router.get('/quizzes/:quizId', getQuizAnalyticsById);

export default router;
