import type { Request, Response } from 'express';
import type { Quiz } from '@prisma/client';
import { createQuiz as createQuizService, getQuizById as getQuizByIdService, listQuizzes } from '../services/quiz.service';
import type { CreateQuizRequestBody, QuizDto } from '../interfaces/quiz.interface';

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



