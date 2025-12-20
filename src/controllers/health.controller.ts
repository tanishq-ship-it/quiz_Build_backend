import { Request, Response } from 'express';
import { getHealth } from '../services/health.service';

export const healthCheck = async (_req: Request, res: Response): Promise<void> => {
  const health = await getHealth();
  res.status(200).json(health);
};


