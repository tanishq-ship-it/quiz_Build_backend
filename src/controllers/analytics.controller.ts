import type { Request, Response } from 'express';
import { getQuizzesWithResponseCounts, getQuizAnalytics } from '../services/analytics.service';
import type { AnalyticsQueryParams, DeviceType } from '../interfaces/analytics.interface';

export const listQuizzesForAnalytics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const quizzes = await getQuizzesWithResponseCounts();
    res.status(200).json(quizzes);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to list quizzes for analytics:', error);
    res.status(500).json({ message: 'Failed to fetch quizzes' });
  }
};

export const getQuizAnalyticsById = async (req: Request, res: Response): Promise<void> => {
  const { quizId } = req.params;
  const { devices, startDate, endDate, range, country } = req.query;

  if (!quizId) {
    res.status(400).json({ message: 'quizId is required' });
    return;
  }

  // Build filters
  const filters: AnalyticsQueryParams = {};

  // Parse device filter
  if (devices && typeof devices === 'string') {
    const validDevices: DeviceType[] = ['iphone', 'android', 'desktop'];
    filters.deviceTypes = devices
      .split(',')
      .filter((d): d is DeviceType => validDevices.includes(d as DeviceType));
  }

  // Parse date range
  if (range && typeof range === 'string') {
    const now = new Date();
    switch (range) {
      case '7d':
        filters.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filters.endDate = now;
        break;
      case '30d':
        filters.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filters.endDate = now;
        break;
      case '90d':
        filters.startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        filters.endDate = now;
        break;
      case 'all':
        // No date filter
        break;
    }
  } else {
    // Custom date range
    if (startDate && typeof startDate === 'string') {
      const parsed = new Date(startDate);
      if (!isNaN(parsed.getTime())) {
        filters.startDate = parsed;
      }
    }
    if (endDate && typeof endDate === 'string') {
      const parsed = new Date(endDate);
      if (!isNaN(parsed.getTime())) {
        filters.endDate = parsed;
      }
    }
  }

  // Parse country filter
  if (country && typeof country === 'string') {
    filters.country = country;
  }

  try {
    const analytics = await getQuizAnalytics(quizId, filters);

    if (!analytics) {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }

    res.status(200).json(analytics);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to get quiz analytics:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
};
