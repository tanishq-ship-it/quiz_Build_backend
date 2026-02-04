import { prisma } from '../config/prisma';
import type {
  QuizListItemDto,
  QuizAnalyticsDto,
  AnalyticsQueryParams,
  DeviceType,
  KPISummaryDto,
  QuestionAttendanceDto,
  DropOffAnalysisDto,
  TimePerQuestionDto,
  DeviceDistributionDto,
  DeviceBreakdownPerQuestionDto,
  ResponsesOverTimeDto,
  PeakHoursHeatmapDto,
  DayOfWeekBreakdownDto,
} from '../interfaces/analytics.interface';

interface ScreenResponseItem {
  screenId: string;
  index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response: any;
  timeTakenMs: number;
  enteredAt: string;
  exitedAt: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const getQuizzesWithResponseCounts = async (): Promise<QuizListItemDto[]> => {
  const quizzes = await prisma.quiz.findMany({
    where: { deletion: false },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      live: true,
      createdAt: true,
    },
  });

  const responseCounts = await prisma.quizResponse.groupBy({
    by: ['quizId'],
    _count: { id: true },
    where: {
      quizId: { in: quizzes.map((q) => q.id) },
    },
  });

  const countMap = new Map(responseCounts.map((r) => [r.quizId, r._count.id]));

  return quizzes.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    live: quiz.live,
    totalResponses: countMap.get(quiz.id) || 0,
    createdAt: quiz.createdAt.toISOString(),
  }));
};

export const getQuizAnalytics = async (
  quizId: string,
  filters: AnalyticsQueryParams
): Promise<QuizAnalyticsDto | null> => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { id: true, title: true, content: true },
  });

  if (!quiz) return null;

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = { quizId };

  if (filters.deviceTypes?.length) {
    whereClause.deviceType = { in: filters.deviceTypes };
  }

  if (filters.startDate || filters.endDate) {
    whereClause.createdAt = {};
    if (filters.startDate) {
      whereClause.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      whereClause.createdAt.lte = filters.endDate;
    }
  }

  const responses = await prisma.quizResponse.findMany({
    where: whereClause,
    select: {
      id: true,
      content: true,
      deviceType: true,
      createdAt: true,
    },
  });

  const totalAttendees = responses.length;

  // Determine date range
  const dateRange = {
    start: filters.startDate?.toISOString() || (responses.length > 0 ? responses[responses.length - 1].createdAt.toISOString() : new Date().toISOString()),
    end: filters.endDate?.toISOString() || new Date().toISOString(),
  };

  if (totalAttendees === 0) {
    return {
      quizId,
      quizTitle: quiz.title,
      dateRange,
      kpiSummary: {
        totalAttendees: 0,
        avgCompletionTimeMs: 0,
        completionRate: 0,
        biggestDropOffQuestion: null,
        peakDay: null,
        peakHour: null,
      },
      attendanceFunnel: [],
      dropOffAnalysis: [],
      timePerQuestion: [],
      deviceDistribution: [],
      deviceBreakdownPerQuestion: [],
      responsesOverTime: [],
      peakHoursHeatmap: [],
      dayOfWeekBreakdown: [],
    };
  }

  // Determine total questions from quiz content
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quizContent = quiz.content as any[];
  const totalQuestions = Array.isArray(quizContent) ? quizContent.length : 0;

  // Process metrics
  const questionMetrics = new Map<
    number,
    {
      attendees: Set<string>;
      totalTimeMs: number;
      timeCount: number;
      byDeviceTime: { iphone: number; android: number; desktop: number };
      deviceCounts: { iphone: Set<string>; android: Set<string>; desktop: Set<string> };
    }
  >();

  for (let i = 0; i < totalQuestions; i++) {
    questionMetrics.set(i, {
      attendees: new Set(),
      totalTimeMs: 0,
      timeCount: 0,
      byDeviceTime: { iphone: 0, android: 0, desktop: 0 },
      deviceCounts: { iphone: new Set(), android: new Set(), desktop: new Set() },
    });
  }

  let totalCompletionTimeMs = 0;
  let completedCount = 0;
  const deviceCounts: Record<DeviceType, number> = { iphone: 0, android: 0, desktop: 0 };

  // Time-based tracking
  const responsesByDate = new Map<string, number>();
  const responsesByHour = new Map<number, number>();
  const responsesByDayOfWeek = new Map<number, number>();
  const heatmapData = new Map<string, number>(); // "dayOfWeek-hour" -> count

  for (const response of responses) {
    const screenResponses = (response.content || []) as unknown as ScreenResponseItem[];
    const device = response.deviceType as DeviceType | null;

    // Only count if device is known
    if (device) {
      deviceCounts[device]++;
    }

    // Time-based aggregations
    const createdAt = response.createdAt;
    const dateKey = createdAt.toISOString().split('T')[0];
    const hour = createdAt.getHours();
    const dayOfWeek = createdAt.getDay();
    const heatmapKey = `${dayOfWeek}-${hour}`;

    responsesByDate.set(dateKey, (responsesByDate.get(dateKey) || 0) + 1);
    responsesByHour.set(hour, (responsesByHour.get(hour) || 0) + 1);
    responsesByDayOfWeek.set(dayOfWeek, (responsesByDayOfWeek.get(dayOfWeek) || 0) + 1);
    heatmapData.set(heatmapKey, (heatmapData.get(heatmapKey) || 0) + 1);

    let sessionTotalTimeMs = 0;
    const maxQuestionReached = screenResponses.length;

    for (const screen of screenResponses) {
      const qIndex = screen.index;
      const metrics = questionMetrics.get(qIndex);

      if (metrics) {
        metrics.attendees.add(response.id);
        metrics.totalTimeMs += screen.timeTakenMs;
        metrics.timeCount++;
        // Only track device-specific metrics if device is known
        if (device) {
          metrics.byDeviceTime[device] += screen.timeTakenMs;
          metrics.deviceCounts[device].add(response.id);
        }
      }

      sessionTotalTimeMs += screen.timeTakenMs;
    }

    if (maxQuestionReached >= totalQuestions && totalQuestions > 0) {
      completedCount++;
      totalCompletionTimeMs += sessionTotalTimeMs;
    }
  }

  // Build attendance funnel
  const attendanceFunnel: QuestionAttendanceDto[] = Array.from(questionMetrics.entries()).map(([idx, m]) => ({
    questionIndex: idx,
    questionLabel: `Q${idx + 1}`,
    attendeeCount: m.attendees.size,
  }));

  // Build drop-off analysis
  const dropOffAnalysis: DropOffAnalysisDto[] = attendanceFunnel.map((item, idx) => {
    const previousCount = idx === 0 ? totalAttendees : attendanceFunnel[idx - 1].attendeeCount;
    const dropOffCount = previousCount - item.attendeeCount;
    const dropOffRate = previousCount > 0 ? (dropOffCount / previousCount) * 100 : 0;

    return {
      questionIndex: item.questionIndex,
      questionLabel: item.questionLabel,
      dropOffCount,
      dropOffRate: Math.round(dropOffRate * 100) / 100,
    };
  });

  // Find biggest drop-off
  const biggestDropOff = dropOffAnalysis.reduce(
    (max, curr) => (curr.dropOffCount > (max?.dropOffCount || 0) ? curr : max),
    null as (typeof dropOffAnalysis)[0] | null
  );

  // Build time per question
  const timePerQuestion: TimePerQuestionDto[] = Array.from(questionMetrics.entries()).map(([idx, m]) => {
    const avgTimeMs = m.timeCount > 0 ? Math.round(m.totalTimeMs / m.timeCount) : 0;

    const iphoneCount = m.deviceCounts.iphone.size;
    const androidCount = m.deviceCounts.android.size;
    const desktopCount = m.deviceCounts.desktop.size;

    return {
      questionIndex: idx,
      questionLabel: `Q${idx + 1}`,
      avgTimeMs,
      byDevice: {
        iphone: iphoneCount > 0 ? Math.round(m.byDeviceTime.iphone / iphoneCount) : 0,
        android: androidCount > 0 ? Math.round(m.byDeviceTime.android / androidCount) : 0,
        desktop: desktopCount > 0 ? Math.round(m.byDeviceTime.desktop / desktopCount) : 0,
      },
    };
  });

  // Device distribution
  const deviceDistribution: DeviceDistributionDto[] = [
    {
      device: 'iphone',
      count: deviceCounts.iphone,
      percentage: Math.round((deviceCounts.iphone / totalAttendees) * 100),
    },
    {
      device: 'android',
      count: deviceCounts.android,
      percentage: Math.round((deviceCounts.android / totalAttendees) * 100),
    },
    {
      device: 'desktop',
      count: deviceCounts.desktop,
      percentage: Math.round((deviceCounts.desktop / totalAttendees) * 100),
    },
  ];

  // Device breakdown per question
  const deviceBreakdownPerQuestion: DeviceBreakdownPerQuestionDto[] = Array.from(questionMetrics.entries()).map(
    ([idx, m]) => ({
      questionIndex: idx,
      questionLabel: `Q${idx + 1}`,
      iphone: m.deviceCounts.iphone.size,
      android: m.deviceCounts.android.size,
      desktop: m.deviceCounts.desktop.size,
    })
  );

  // Responses over time (sorted by date)
  const responsesOverTime: ResponsesOverTimeDto[] = Array.from(responsesByDate.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Find peak day
  const peakDayEntry = responsesOverTime.reduce(
    (max, curr) => (curr.count > (max?.count || 0) ? curr : max),
    null as ResponsesOverTimeDto | null
  );

  // Find peak hour
  const peakHourEntry = Array.from(responsesByHour.entries()).reduce(
    (max, [hour, count]) => (count > (max?.count || 0) ? { hour, count } : max),
    null as { hour: number; count: number } | null
  );

  // Peak hours heatmap
  const peakHoursHeatmap: PeakHoursHeatmapDto[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${day}-${hour}`;
      peakHoursHeatmap.push({
        dayOfWeek: day,
        hour,
        count: heatmapData.get(key) || 0,
      });
    }
  }

  // Day of week breakdown
  const dayOfWeekBreakdown: DayOfWeekBreakdownDto[] = Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    dayName: DAY_NAMES[i],
    count: responsesByDayOfWeek.get(i) || 0,
  }));

  // Build KPI summary
  const kpiSummary: KPISummaryDto = {
    totalAttendees,
    avgCompletionTimeMs: completedCount > 0 ? Math.round(totalCompletionTimeMs / completedCount) : 0,
    completionRate: Math.round((completedCount / totalAttendees) * 100),
    biggestDropOffQuestion: biggestDropOff
      ? {
          questionIndex: biggestDropOff.questionIndex,
          questionId: `q_${biggestDropOff.questionIndex}`,
          dropOffCount: biggestDropOff.dropOffCount,
          dropOffRate: biggestDropOff.dropOffRate,
        }
      : null,
    peakDay: peakDayEntry ? { date: peakDayEntry.date, count: peakDayEntry.count } : null,
    peakHour: peakHourEntry,
  };

  return {
    quizId,
    quizTitle: quiz.title,
    dateRange,
    kpiSummary,
    attendanceFunnel,
    dropOffAnalysis,
    timePerQuestion,
    deviceDistribution,
    deviceBreakdownPerQuestion,
    responsesOverTime,
    peakHoursHeatmap,
    dayOfWeekBreakdown,
  };
};
