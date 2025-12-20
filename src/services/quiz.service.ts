import type { Quiz } from '@prisma/client';
import { prisma } from '../config/prisma';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CreateQuizInput { title: string; content?: any }

export const createQuiz = async (input: CreateQuizInput): Promise<Quiz> => {
  const { title, content } = input;

  return prisma.quiz.create({
    data: {
      title,
      // Store whatever JSON structure the frontend sends, or null by default
      content: content ?? null,
      // `live` and `createdAt` use their Prisma defaults
    },
  });
};

export const getQuizById = async (id: string): Promise<Quiz | null> => {
  return prisma.quiz.findUnique({
    where: { id },
  });
};

export const listQuizzes = async (): Promise<Quiz[]> => {
  return prisma.quiz.findMany({
    orderBy: { createdAt: 'desc' },
  });
};



