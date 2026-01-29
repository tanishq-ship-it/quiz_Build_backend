import { prisma } from '../config/prisma';
import type { WebQuiz, Prisma } from '@prisma/client';

// Get the current active web quiz
export const getActiveWebQuiz = async (): Promise<WebQuiz | null> => {
  return prisma.webQuiz.findFirst({
    where: { isActive: true },
  });
};

// Get the current active web quiz with quiz details
export const getActiveWebQuizWithDetails = async () => {
  const webQuiz = await prisma.webQuiz.findFirst({
    where: { isActive: true },
  });

  if (!webQuiz) {
    return null;
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: webQuiz.quizId },
    select: {
      id: true,
      title: true,
      content: true,
      live: true,
    },
  });

  return {
    ...webQuiz,
    quiz,
  };
};

// Set a quiz as the website quiz (only one can exist at a time)
export const setWebQuiz = async (quizId: string, userId: string): Promise<WebQuiz> => {
  // First, verify the quiz exists and is live
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
  });

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  if (!quiz.live) {
    throw new Error('Quiz must be live to be set as website quiz');
  }

  // Use a transaction to ensure only one quiz exists
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Delete all existing web quiz records
    await tx.webQuiz.deleteMany({});

    // Create new web quiz record
    return tx.webQuiz.create({
      data: {
        quizId,
        isActive: true,
        setBy: userId,
      },
    });
  });
};

// Unset the web quiz (delete from database)
export const unsetWebQuiz = async (quizId: string): Promise<WebQuiz | null> => {
  const webQuiz = await prisma.webQuiz.findUnique({
    where: { quizId },
  });

  if (!webQuiz) {
    return null;
  }

  return prisma.webQuiz.delete({
    where: { id: webQuiz.id },
  });
};

// Check if a specific quiz is the active web quiz
export const isQuizActiveOnWeb = async (quizId: string): Promise<boolean> => {
  const webQuiz = await prisma.webQuiz.findFirst({
    where: {
      quizId,
      isActive: true,
    },
  });

  return webQuiz !== null;
};
