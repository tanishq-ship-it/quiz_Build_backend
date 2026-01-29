import type { Request, Response } from 'express';
import type { WebQuiz } from '@prisma/client';
import {
  getActiveWebQuiz,
  getActiveWebQuizWithDetails,
  setWebQuiz,
  unsetWebQuiz,
} from '../services/webQuiz.service';
import type { SetWebQuizRequestBody, WebQuizDto } from '../interfaces/webQuiz.interface';

const toWebQuizDto = (webQuiz: WebQuiz): WebQuizDto => ({
  id: webQuiz.id,
  quizId: webQuiz.quizId,
  isActive: webQuiz.isActive,
  setBy: webQuiz.setBy,
  createdAt: webQuiz.createdAt.toISOString(),
  updatedAt: webQuiz.updatedAt.toISOString(),
});

// GET /api/web-quiz - Get current active web quiz (protected)
export const getWebQuiz = async (_req: Request, res: Response): Promise<void> => {
  try {
    const webQuiz = await getActiveWebQuiz();

    if (!webQuiz) {
      res.status(200).json(null);
      return;
    }

    res.status(200).json(toWebQuizDto(webQuiz));
  } catch (error) {
    console.error('Error getting web quiz:', error);
    res.status(500).json({ message: 'Failed to get web quiz' });
  }
};

// GET /api/public/web-quiz - Get current active web quiz with quiz details (public)
export const getPublicWebQuiz = async (_req: Request, res: Response): Promise<void> => {
  try {
    const webQuizWithDetails = await getActiveWebQuizWithDetails();

    if (!webQuizWithDetails) {
      res.status(200).json(null);
      return;
    }

    // Only return if quiz is live
    if (!webQuizWithDetails.quiz || !webQuizWithDetails.quiz.live) {
      res.status(200).json(null);
      return;
    }

    res.status(200).json({
      id: webQuizWithDetails.id,
      quizId: webQuizWithDetails.quizId,
      isActive: webQuizWithDetails.isActive,
      setBy: webQuizWithDetails.setBy,
      createdAt: webQuizWithDetails.createdAt.toISOString(),
      updatedAt: webQuizWithDetails.updatedAt.toISOString(),
      quiz: webQuizWithDetails.quiz,
    });
  } catch (error) {
    console.error('Error getting public web quiz:', error);
    res.status(500).json({ message: 'Failed to get web quiz' });
  }
};

// POST /api/web-quiz - Set a quiz as the website quiz (protected)
export const setWebQuizController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quizId } = req.body as SetWebQuizRequestBody;

    if (!quizId || typeof quizId !== 'string') {
      res.status(400).json({ message: 'quizId is required' });
      return;
    }

    // Get user ID from auth middleware
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const webQuiz = await setWebQuiz(quizId, userId);
    res.status(200).json(toWebQuizDto(webQuiz));
  } catch (error) {
    console.error('Error setting web quiz:', error);

    if (error instanceof Error) {
      if (error.message === 'Quiz not found') {
        res.status(404).json({ message: 'Quiz not found' });
        return;
      }
      if (error.message === 'Quiz must be live to be set as website quiz') {
        res.status(400).json({ message: error.message });
        return;
      }
    }

    res.status(500).json({ message: 'Failed to set web quiz' });
  }
};

// DELETE /api/web-quiz/:quizId - Unset a quiz as website quiz (protected)
export const unsetWebQuizController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { quizId } = req.params;

    if (!quizId) {
      res.status(400).json({ message: 'quizId is required' });
      return;
    }

    const webQuiz = await unsetWebQuiz(quizId);

    if (!webQuiz) {
      res.status(404).json({ message: 'Web quiz not found' });
      return;
    }

    res.status(200).json(toWebQuizDto(webQuiz));
  } catch (error) {
    console.error('Error unsetting web quiz:', error);
    res.status(500).json({ message: 'Failed to unset web quiz' });
  }
};
