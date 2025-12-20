// Quiz HTTP-level interfaces

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CreateQuizRequestBody { title: string; content?: any }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface QuizDto {
  id: string;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any;
  live: boolean;
  deletion: boolean;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AppendScreensRequestBody { screens: any[] }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ReplaceScreensRequestBody { screens: any[] }

export interface UpdateQuizLiveRequestBody { live: boolean }

export interface UpdateQuizDeletionRequestBody { deletion: boolean }



