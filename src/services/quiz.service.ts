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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const appendScreensToQuiz = async (id: string, screens: any[]): Promise<Quiz> => {
  const quiz = await prisma.quiz.findUnique({
    where: { id },
  });

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  const existingContent = quiz.content;

  // Normalise existing content to an array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let baseScreens: any[];
  if (Array.isArray(existingContent)) {
    baseScreens = existingContent;
  } else if (existingContent == null) {
    baseScreens = [];
  } else {
    baseScreens = [existingContent];
  }

  const newContent = [...baseScreens, ...screens];

  return prisma.quiz.update({
    where: { id },
    data: {
      content: newContent,
    },
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const replaceQuizScreens = async (id: string, screens: any[]): Promise<Quiz> => {
  const quiz = await prisma.quiz.findUnique({
    where: { id },
  });

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  return prisma.quiz.update({
    where: { id },
    data: {
      content: screens,
    },
  });
};


export const updateQuizLive = async (id: string, live: boolean): Promise<Quiz> => {
  const quiz = await prisma.quiz.findUnique({
    where: { id },
  });

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  return prisma.quiz.update({
    where: { id },
    data: {
      live,
    },
  });
};


