import type { QuizResponse } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { ScreenResponseItem } from '../interfaces/quizResponse.interface';

export const createQuizResponse = async (quizId: string): Promise<QuizResponse> => {
  return prisma.quizResponse.create({
    data: {
      quizId,
      content: [],
    },
  });
};

export const appendScreenResponse = async (id: string, screen: ScreenResponseItem): Promise<number> => {
  const payload = JSON.stringify([screen]);

  // Use a single UPDATE statement that appends the new screen response to the JSON array.
  // This avoids pulling the existing content into application memory.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const updated = await prisma.$executeRawUnsafe(
    `
      UPDATE "QuizResponse"
      SET "content" = COALESCE("content", '[]'::jsonb) || $1::jsonb
      WHERE "id" = $2
    `,
    payload,
    id,
  );

  return updated;
};



