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
    where: { deletion: false },
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

export const updateQuizDeletion = async (id: string, _deletion: boolean): Promise<Quiz> => {
  const quiz = await prisma.quiz.findUnique({
    where: { id },
  });

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  return prisma.quiz.update({
    where: { id },
    data: {
      deletion: true,
      live: false,
    },
  });
};



// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const removeScreenFromQuiz = async (id: string, screenId: string, index?: number): Promise<Quiz> => {
  const quiz = await prisma.quiz.findUnique({
    where: { id },
  });

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingContent = quiz.content as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let newContent: any;

  if (Array.isArray(existingContent)) {
    // Case 1: Array of screens
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof index === 'number') {
      newContent = existingContent.filter((_s: any, idx: number) => idx !== index);
    } else {
      newContent = existingContent.filter((s: any) => s.id !== screenId);
    }
  } else if (existingContent && typeof existingContent === 'object' && Array.isArray(existingContent.screens)) {
    // Case 2: Config object with screens array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let newScreens: any[];
    if (typeof index === 'number') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newScreens = existingContent.screens.filter((_s: any, idx: number) => idx !== index);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newScreens = existingContent.screens.filter((s: any) => s.id !== screenId);
    }
    newContent = { ...existingContent, screens: newScreens };
  } else if (existingContent && typeof existingContent === 'object' && existingContent.id === screenId) {
    // Case 3: Single screen object that matches
    newContent = [];
  } else {
    // Case 4: Single screen not matching, or null, or unknown structure
    newContent = existingContent;
  }

  return prisma.quiz.update({
    where: { id },
    data: {
      content: newContent ?? undefined, 
    },
  });
};
