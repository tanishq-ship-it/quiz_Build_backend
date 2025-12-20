import { HealthResponse } from '../interfaces/health.interface';
import { prisma } from '../config/prisma';

export const getHealth = async (): Promise<HealthResponse> => {
  // Simple DB check – if Supabase/Prisma is broken, this will throw
  await prisma.$queryRaw`SELECT 1`;

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
};


