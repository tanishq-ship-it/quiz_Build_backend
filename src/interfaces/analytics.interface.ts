// Analytics API interfaces

export type DeviceType = 'iphone' | 'android' | 'desktop';

// =====================
// REQUEST DTOs
// =====================

export interface AnalyticsQueryParams {
  deviceTypes?: DeviceType[];
  startDate?: Date;
  endDate?: Date;
  country?: string;
}

// =====================
// RESPONSE DTOs
// =====================

export interface QuizListItemDto {
  id: string;
  title: string;
  live: boolean;
  totalResponses: number;
  createdAt: string;
}

export interface BiggestDropOffDto {
  questionIndex: number;
  questionId: string;
  dropOffCount: number;
  dropOffRate: number;
}

export interface PeakDayDto {
  date: string;
  count: number;
}

export interface PeakHourDto {
  hour: number;
  count: number;
}

export interface KPISummaryDto {
  totalAttendees: number;
  avgCompletionTimeMs: number;
  completionRate: number;
  biggestDropOffQuestion: BiggestDropOffDto | null;
  peakDay: PeakDayDto | null;
  peakHour: PeakHourDto | null;
}

export interface QuestionAttendanceDto {
  questionIndex: number;
  questionLabel: string;
  attendeeCount: number;
}

export interface DropOffAnalysisDto {
  questionIndex: number;
  questionLabel: string;
  dropOffCount: number;
  dropOffRate: number;
}

export interface TimePerQuestionDto {
  questionIndex: number;
  questionLabel: string;
  avgTimeMs: number;
  byDevice: {
    iphone: number;
    android: number;
    desktop: number;
  };
}

export interface DeviceDistributionDto {
  device: DeviceType;
  count: number;
  percentage: number;
}

export interface DeviceBreakdownPerQuestionDto {
  questionIndex: number;
  questionLabel: string;
  iphone: number;
  android: number;
  desktop: number;
}

export interface ResponsesOverTimeDto {
  date: string;
  count: number;
}

export interface PeakHoursHeatmapDto {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface DayOfWeekBreakdownDto {
  dayOfWeek: number;
  dayName: string;
  count: number;
}

export interface DateRangeDto {
  start: string;
  end: string;
}

export interface CountryDistributionDto {
  country: string;
  count: number;
  percentage: number;
  cities: { city: string; count: number }[];
}

export interface QuizAnalyticsDto {
  quizId: string;
  quizTitle: string;
  dateRange: DateRangeDto;
  kpiSummary: KPISummaryDto;
  attendanceFunnel: QuestionAttendanceDto[];
  dropOffAnalysis: DropOffAnalysisDto[];
  timePerQuestion: TimePerQuestionDto[];
  deviceDistribution: DeviceDistributionDto[];
  deviceBreakdownPerQuestion: DeviceBreakdownPerQuestionDto[];
  responsesOverTime: ResponsesOverTimeDto[];
  peakHoursHeatmap: PeakHoursHeatmapDto[];
  dayOfWeekBreakdown: DayOfWeekBreakdownDto[];
  countryDistribution: CountryDistributionDto[];
}
