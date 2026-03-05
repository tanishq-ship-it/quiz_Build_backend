import type { Request, Response } from 'express';
import type { QuizResponse } from '@prisma/client';
import geoip from 'geoip-lite';
import { createQuizResponse as createQuizResponseService, appendScreenResponse as appendScreenResponseService } from '../services/quizResponse.service';
import type { AppendScreenResponseRequestBody, CreateQuizResponseRequestBody, QuizResponseDto } from '../interfaces/quizResponse.interface';

const toQuizResponseDto = (entity: QuizResponse): QuizResponseDto => ({
  id: entity.id,
  quizId: entity.quizId,
  content: entity.content ?? [],
  deviceType: entity.deviceType,
  createdAt: entity.createdAt.toISOString(),
});

// Used by public routes — isLive defaults to true (real user data)
export const createQuizResponse = async (req: Request, res: Response): Promise<void> => {
  const { quizId, deviceType, country: bodyCountry, city: bodyCity } = req.body as CreateQuizResponseRequestBody & { country?: string; city?: string };

  if (!quizId || typeof quizId !== 'string') {
    res.status(400).json({ message: 'quizId is required' });
    return;
  }

  const validDeviceTypes = ['iphone', 'android', 'desktop'];
  const normalizedDeviceType = deviceType && validDeviceTypes.includes(deviceType) ? deviceType : undefined;

  const forwarded = req.headers['x-forwarded-for'];
  let ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip;
  if (ip) ip = ip.replace(/^::ffff:/, '');
  const geo = ip ? geoip.lookup(ip) : null;
  console.log('Quiz response IP:', ip, '-> Geo:', geo?.country, geo?.city);

  try {
    const response = await createQuizResponseService(
      quizId.trim(),
      normalizedDeviceType,
      bodyCountry || geo?.country || undefined,
      bodyCity || geo?.city || undefined,
      true,
    );
    res.status(201).json(toQuizResponseDto(response));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ message: 'Failed to create quiz response' });
  }
};

// Used by protected/admin routes — isLive is false (preview/test data)
export const createPreviewQuizResponse = async (req: Request, res: Response): Promise<void> => {
  const { quizId, deviceType } = req.body as CreateQuizResponseRequestBody;

  if (!quizId || typeof quizId !== 'string') {
    res.status(400).json({ message: 'quizId is required' });
    return;
  }

  const validDeviceTypes = ['iphone', 'android', 'desktop'];
  const normalizedDeviceType = deviceType && validDeviceTypes.includes(deviceType) ? deviceType : undefined;

  try {
    const response = await createQuizResponseService(
      quizId.trim(),
      normalizedDeviceType,
      undefined,
      undefined,
      false,
    );
    res.status(201).json(toQuizResponseDto(response));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ message: 'Failed to create preview response' });
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



