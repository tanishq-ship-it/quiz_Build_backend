import type { Request, Response } from 'express';
import type { QuizResponse } from '@prisma/client';
import { createQuizResponse as createQuizResponseService, appendScreenResponse as appendScreenResponseService } from '../services/quizResponse.service';
import type { AppendScreenResponseRequestBody, CreateQuizResponseRequestBody, QuizResponseDto } from '../interfaces/quizResponse.interface';

const toQuizResponseDto = (entity: QuizResponse): QuizResponseDto => ({
  id: entity.id,
  quizId: entity.quizId,
  content: entity.content ?? [],
  createdAt: entity.createdAt.toISOString(),
});

export const createQuizResponse = async (req: Request, res: Response): Promise<void> => {
  const { quizId } = req.body as CreateQuizResponseRequestBody;

  if (!quizId || typeof quizId !== 'string') {
    res.status(400).json({ message: 'quizId is required' });
    return;
  }

  try {
    const response = await createQuizResponseService(quizId.trim());
    res.status(201).json(toQuizResponseDto(response));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ message: 'Failed to create quiz response' });
  }
};

export const appendScreenResponse = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ message: 'id is required' });
    return;
  }

  const { screen } = req.body as AppendScreenResponseRequestBody;

  if (!screen || typeof screen.screenId !== 'string' || typeof screen.index !== 'number' || typeof screen.timeTakenMs !== 'number' || typeof screen.enteredAt !== 'string' || typeof screen.exitedAt !== 'string') {
    res.status(400).json({ message: 'screen payload is invalid' });
    return;
  }

  try {
    const updated = await appendScreenResponseService(id, screen);

    if (updated === 0) {
      res.status(404).json({ message: 'Quiz response not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ message: 'Failed to append screen response' });
  }
};



