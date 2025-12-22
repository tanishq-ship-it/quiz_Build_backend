// Quiz response HTTP-level interfaces

// Single screen response item as stored inside QuizResponse.content
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ScreenResponseItem { screenId: string; index: number; response: any; timeTakenMs: number; enteredAt: string; exitedAt: string }

export interface CreateQuizResponseRequestBody {
  quizId: string;
}

export interface AppendScreenResponseRequestBody {
  screen: ScreenResponseItem;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface QuizResponseDto { id: string; quizId: string; content: any; createdAt: string }



