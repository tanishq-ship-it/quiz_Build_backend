import type { Request, Response } from 'express';
import type { Quiz } from '@prisma/client';
import { appendScreensToQuiz, createQuiz as createQuizService, getQuizById as getQuizByIdService, listQuizzes, replaceQuizScreens, updateQuizLive } from '../services/quiz.service';
import type { AppendScreensRequestBody, CreateQuizRequestBody, QuizDto, ReplaceScreensRequestBody, UpdateQuizLiveRequestBody } from '../interfaces/quiz.interface';

const toQuizDto = (quiz: Quiz): QuizDto => ({
  id: quiz.id,
  title: quiz.title,
  // Pass raw JSON content through – frontend knows how to interpret it
  content: quiz.content,
  live: quiz.live,
  createdAt: quiz.createdAt.toISOString(),
});

export const createQuiz = async (req: Request, res: Response): Promise<void> => {
  const { title, content } = req.body as CreateQuizRequestBody;

  if (!title || typeof title !== 'string') {
    res.status(400).json({ message: 'title is required' });
    return;
  }

  const quiz = await createQuizService({
    title: title.trim(),
    content,
  });

  res.status(201).json(toQuizDto(quiz));
};

export const getQuiz = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ message: 'id is required' });
    return;
  }

  const quiz = await getQuizByIdService(id);

  if (!quiz) {
    res.status(404).json({ message: 'Quiz not found' });
    return;
  }

  res.status(200).json(toQuizDto(quiz));
};

export const getQuizzes = async (_req: Request, res: Response): Promise<void> => {
  const quizzes = await listQuizzes();
  res.status(200).json(quizzes.map(toQuizDto));
};

export const addQuizScreens = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ message: 'id is required' });
    return;
  }

  const { screens } = req.body as AppendScreensRequestBody;

  if (!Array.isArray(screens) || screens.length === 0) {
    res.status(400).json({ message: 'screens must be a non-empty array' });
    return;
  }

  try {
    const quiz = await appendScreensToQuiz(id, screens);
    res.status(200).json(toQuizDto(quiz));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    if (error instanceof Error && error.message === 'Quiz not found') {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }

    res.status(500).json({ message: 'Failed to add screens' });
  }
};

export const updateQuizScreens = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ message: 'id is required' });
    return;
  }

  const { screens } = req.body as ReplaceScreensRequestBody;

  if (!Array.isArray(screens)) {
    res.status(400).json({ message: 'screens must be an array' });
    return;
  }

  try {
    const quiz = await replaceQuizScreens(id, screens);
    res.status(200).json(toQuizDto(quiz));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    if (error instanceof Error && error.message === 'Quiz not found') {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }

    res.status(500).json({ message: 'Failed to update screens' });
  }
};

export const updateQuizLiveStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ message: 'id is required' });
    return;
  }

  const { live } = req.body as UpdateQuizLiveRequestBody;

  if (typeof live !== 'boolean') {
    res.status(400).json({ message: 'live must be a boolean' });
    return;
  }

  try {
    const quiz = await updateQuizLive(id, live);
    res.status(200).json(toQuizDto(quiz));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    if (error instanceof Error && error.message === 'Quiz not found') {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }

    res.status(500).json({ message: 'Failed to update live status' });
  }
};



